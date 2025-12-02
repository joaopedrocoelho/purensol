// Types for Google Forms API responses

export interface Image {
  contentUri: string;
  properties?: {
    alignment?: "LEFT" | "CENTER" | "RIGHT";
    width?: number;
    height?: number;
  };
}

export interface Question {
  questionId: string;
  required?: boolean;
  choiceQuestion?: {
    type: "RADIO" | "CHECKBOX" | "DROP_DOWN";
    options: Array<{
      value: string;
      image?: Image;
    }>;
  };
  textQuestion?: {
    paragraph?: boolean; // true for paragraph, false for short answer
  };
  scaleQuestion?: {
    low: number;
    high: number;
    lowLabel?: string;
    highLabel?: string;
  };
  dateQuestion?: {
    includeYear?: boolean;
    includeTime?: boolean;
  };
  timeQuestion?: {
    duration?: boolean;
  };
  fileUploadQuestion?: {
    maxFiles?: number;
    maxFileSize?: string;
    types?: string[];
  };
}

export interface GoogleFormItem {
  itemId: string;
  title: string;
  description?: string;
  questionItem?: {
    question: Question;
    image?: Image;
  };
  pageBreakItem?: Record<string, never>;
  questionGroupItem?: {
    questions: Array<Question>;
    grid?: {
      columns: {
        type: "RADIO" | "CHECKBOX";
        options: Array<{
          value: string;
        }>;
      };
      rows: Array<{
        value: string;
      }>;
    };
    image?: Image;
  };
}

export interface GoogleForm {
  formId: string;
  info: {
    title: string;
    description?: string;
    documentTitle?: string;
  };
  items: GoogleFormItem[];
  responderUri?: string;
  revisionId?: string;
}

export interface FormResponse {
  formId: string;
  responses: Array<{
    questionId: string;
    textAnswers?: {
      answers: Array<{
        value: string;
      }>;
    };
    choiceAnswers?: {
      answers: Array<{
        value: string;
      }>;
    };
  }>;
}
