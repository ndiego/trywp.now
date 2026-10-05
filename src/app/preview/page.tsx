import type { Metadata } from "next";
import { TryPreview } from "@/components/try/TryPreview";
import "@/components/try/try.css";

export const metadata: Metadata = { title: "Preview – Try WordPress" };

export default function Preview() {
  return <TryPreview />;
}
