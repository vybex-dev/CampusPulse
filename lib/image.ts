/**
 * Client-side canvas resize helper for Waste Lab.
 * Limits image long edge to 1024px and outputs JPEG at 0.8 quality.
 */
export async function resizeImageToMax1024(
  fileOrBlob: Blob,
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image format"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxEdge = 1024;

        if (width > maxEdge || height > maxEdge) {
          if (width > height) {
            height = Math.round((height * maxEdge) / width);
            width = maxEdge;
          } else {
            width = Math.round((width * maxEdge) / height);
            height = maxEdge;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not create canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas to blob conversion failed"));
              return;
            }
            resolve({ blob, dataUrl });
          },
          "image/jpeg",
          0.8,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}
