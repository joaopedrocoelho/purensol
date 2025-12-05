import type { GoogleForm } from "@/types/googleForms";

const FormHeader = ({
  form,
  currentStep,
}: {
  form: GoogleForm;
  currentStep: number;
}) => {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {form.info.title}
      </h1>
      {form.info.description && currentStep === 1 && (
        <p className="text-gray-600 mb-6 whitespace-pre-line">
          {form.info.description}
        </p>
      )}
    </>
  );
};

export default FormHeader;
