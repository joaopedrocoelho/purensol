import { GoogleFormItem } from "@/types/googleForms";

const PageBreakItem = ({ item }: { item: GoogleFormItem }) => {
  return <hr key={item.itemId} className="my-8 border-gray-300" />;
};

export default PageBreakItem;
