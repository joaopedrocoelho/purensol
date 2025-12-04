import { GetStaticProps } from "next";
import { useEffect } from "react";
import Image from "next/image";
import DynamicForm from "@/components/DynamicForm";
import type { GoogleForm } from "@/types/googleForms";
import { extractFormId } from "@/lib/googleForms";
import { fetchGoogleFormWithAuth } from "@/lib/googleAuth";
import Head from "next/head";

interface HomeProps {
  form: GoogleForm | null;
  error: string | null;
}

export default function Home({ form, error }: HomeProps) {
  useEffect(() => {
    console.log(form);
  }, [form]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!form?.formId) {
      console.error("No form ID available");
      return;
    }

    // Calculate total from form data (same logic as in DynamicForm)
    const extractPrice = (title: string | undefined): number | null => {
      if (!title) return null;
      const match = title.match(/\$(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };

    let calculatedTotal = 0;
    const firstGiftQuestionId = form.items.find(
      (item) =>
        item.title?.includes("✦第一階段滿額贈") ||
        item.title?.includes("第一階段滿額贈")
    )?.questionItem?.question?.questionId;
    const secondGiftQuestionId = form.items.find(
      (item) =>
        item.title?.includes("✦第二階段滿額贈") ||
        item.title?.includes("第二階段滿額贈")
    )?.questionItem?.question?.questionId;

    Object.entries(data).forEach(([fieldName, value]) => {
      const questionIdMatch = fieldName.match(
        /^question_(.+?)(?:_row_\d+_col_\d+)?$/
      );
      if (!questionIdMatch) return;

      const questionId = questionIdMatch[1];
      if (
        questionId === firstGiftQuestionId ||
        questionId === secondGiftQuestionId
      )
        return; // Skip gifts in total

      const item = form.items.find(
        (i) =>
          i.questionItem?.question?.questionId === questionId ||
          i.questionGroupItem?.questions?.some(
            (q) => q.questionId === questionId
          )
      );

      if (!item) return;

      const itemPrice = extractPrice(item.title);

      if (Array.isArray(value)) {
        value.forEach((val) => {
          if (val && String(val).trim()) {
            const optionPrice = extractPrice(String(val));
            calculatedTotal += optionPrice || itemPrice || 0;
          }
        });
      } else if (value && String(value).trim()) {
        const optionPrice = extractPrice(String(value));
        calculatedTotal += optionPrice || itemPrice || 0;
      }
    });

    try {
      const response = await fetch(`/api/forms/${form.formId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: data,
          total: calculatedTotal,
          // You can optionally include email if you have it
          // email: "user@example.com",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "提交表單失敗");
      }

      console.log("Form submitted successfully to Google Sheet");
    } catch (error) {
      console.error("Error submitting form:", error);
      throw error; // Re-throw to let DynamicForm handle the error
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Pure n Sol</title>
      </Head>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-center">
          <Image
            src="/purensol.png"
            alt="Pure n Sol"
            width={300}
            height={150}
            className="object-contain"
            priority
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">錯誤</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <p className="text-red-600 text-xs mt-2">
              請檢查您的 Google Cloud Platform
              設定，並確保表單已與您的服務帳號共用。請參閱 README 以取得說明。
            </p>
          </div>
        )}

        {form && !error && <DynamicForm form={form} onSubmit={handleSubmit} />}

        {!form && !error && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-600">
              沒有可用的表單資料。請檢查您的設定。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  // Default form URL - you can change this or make it configurable via env

  try {
    const formId = extractFormId(
      "17uiIaF6yUdkhX4IK_u_Sr5UrttxS19-BiJRI-e-nOKo"
    );

    if (!formId) {
      return {
        props: {
          form: null,
          error: "無效的表單網址。請檢查 GOOGLE_FORM_URL 環境變數。",
        },
      };
    }

    // Fetch form data using authenticated client
    const form = await fetchGoogleFormWithAuth(formId);

    return {
      props: {
        form,
        error: null,
      },
      // Revalidate every hour (60 seconds)
      // You can adjust this based on how often your form changes
      revalidate: 60,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    const errorMessage =
      error instanceof Error ? error.message : "無法取得表單資料";
    return {
      props: {
        form: null,
        error: errorMessage,
      },
      // Still revalidate on error so it can recover
      revalidate: 60,
    };
  }
};
