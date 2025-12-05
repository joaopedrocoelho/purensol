import type { Image as FormImage } from "@/types/googleForms";
import { transformImageUrl } from "@/lib/transformImageUrl";

export const Photo = ({
  image,
  alt,
}: {
  image: FormImage | undefined;
  alt: string;
}) => {
  if (!image?.contentUri) return null;

  const width = image.properties?.width || 400;
  const alignment = image.properties?.alignment || "LEFT";
  const imageUrl = transformImageUrl(image.contentUri, width);

  return (
    <div
      className={`my-4 ${
        alignment === "CENTER"
          ? "flex justify-center"
          : alignment === "RIGHT"
          ? "flex justify-end"
          : ""
      }`}
    >
      <img
        src={imageUrl}
        alt={alt}
        width={width}
        className="rounded-lg shadow-sm max-w-full h-auto"
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default Photo;
