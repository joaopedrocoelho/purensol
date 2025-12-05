import React from "react";

interface FormNavButtonsProps {
  currentStep: number;
  totalFormSteps: number;
  onStepBack: () => void;
  onNextStep: () => void;
}

export default function FormNavButtons({
  currentStep,
  totalFormSteps,
  onStepBack,
  onNextStep,
}: FormNavButtonsProps) {
  return (
    <div className="mt-8 pt-6 border-t border-gray-200 flex space-x-4">
      {currentStep > 1 && (
        <button
          type="button"
          onClick={onStepBack}
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          上一步
        </button>
      )}
      <button
        type="button"
        onClick={onNextStep}
        className={`${
          currentStep > 1 ? "flex-1" : "w-full"
        } px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
      >
        {currentStep === totalFormSteps ? "確認訂單" : "下一步"}
      </button>
    </div>
  );
}
