import { GetStaticProps } from "next";
import { useState, useEffect } from "react";
import DynamicForm from "@/components/DynamicForm";
import type { GoogleForm } from "@/types/googleForms";
import { extractFormId } from "@/lib/googleForms";
import { fetchGoogleFormWithAuth } from "@/lib/googleAuth";

interface HomeProps {
  form: GoogleForm | null;
  error: string | null;
}

export default function Home({ form, error }: HomeProps) {
  useEffect(() => {
    console.log(form);
  }, [form]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    console.log("Form data submitted:", data);
    // Here you can add logic to submit to Google Forms API or your own backend
    // Example: await submitToGoogleForms(form?.formId, data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Google Forms Dynamic Renderer
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <p className="text-red-600 text-xs mt-2">
              Please check your Google Cloud Platform setup and ensure the form
              is shared with your service account. See the README for
              instructions.
            </p>
          </div>
        )}

        {form && !error && <DynamicForm form={form} onSubmit={handleSubmit} />}

        {!form && !error && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-600">
              No form data available. Please check your configuration.
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
          error:
            "Invalid form URL. Please check GOOGLE_FORM_URL environment variable.",
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
      // Revalidate every hour (3600 seconds)
      // You can adjust this based on how often your form changes
      revalidate: 3600,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch form data";
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
