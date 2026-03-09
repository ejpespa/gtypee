import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { google } from "googleapis";

import { ServiceRuntime } from "../../googleapi/auth-factory.js";
import { scopes } from "../../googleauth/service.js";
import type { SlidesCommandDeps, SlidesCreateResult, SlideSummary } from "./commands.js";

type SlidePageElement = {
  shape?: {
    text?: {
      textElements?: Array<{
        textRun?: { content?: string | null };
      }>;
    };
  };
};

type SlidePage = {
  pageElements?: SlidePageElement[];
};

function extractSlideTitle(slide: SlidePage, index: number): string {
  const elements = slide.pageElements;
  if (!elements || elements.length === 0) {
    return `Slide ${index + 1}`;
  }

  // Look at the first shape that has text content.
  for (const element of elements) {
    const textElements = element.shape?.text?.textElements;
    if (!textElements) {
      continue;
    }
    const parts: string[] = [];
    for (const te of textElements) {
      const content = te.textRun?.content?.trim();
      if (content) {
        parts.push(content);
      }
    }
    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return `Slide ${index + 1}`;
}

function formatToMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "txt":
      return "text/plain";
    default:
      return "application/pdf";
  }
}

function formatToExtension(format: string): string {
  switch (format.toLowerCase()) {
    case "pdf":
      return "pdf";
    case "pptx":
      return "pptx";
    case "txt":
      return "txt";
    default:
      return format.toLowerCase();
  }
}

export function buildSlidesCommandDeps(runtime: ServiceRuntime): Required<SlidesCommandDeps> {
  const createPresentation = async (title: string): Promise<SlidesCreateResult> => {
    const auth = await runtime.getClient(scopes("slides"));
    const slides = google.slides({ version: "v1", auth });
    const response = await slides.presentations.create({
      requestBody: { title },
    });
    return { id: response.data.presentationId ?? "", title: response.data.title ?? title };
  };

  const listSlides = async (presentationId: string): Promise<SlideSummary[]> => {
    const auth = await runtime.getClient(scopes("slides"));
    const slides = google.slides({ version: "v1", auth });
    const response = await slides.presentations.get({ presentationId });
    const pages = (response.data.slides as SlidePage[] | undefined) ?? [];
    return pages.map((page, i) => ({
      index: i,
      title: extractSlideTitle(page, i),
    }));
  };

  const readSlide = async (presentationId: string, index: number): Promise<SlideSummary> => {
    const allSlides = await listSlides(presentationId);
    const slide = allSlides[index];
    if (!slide) {
      throw new Error(`Slide index ${index} out of range (presentation has ${allSlides.length} slides)`);
    }
    return slide;
  };

  const exportSlides = async (
    presentationId: string,
    format: string,
  ): Promise<{ id: string; format: string; path: string; exported: boolean }> => {
    const auth = await runtime.getClient(scopes("slides"));
    const drive = google.drive({ version: "v3", auth });
    const mimeType = formatToMimeType(format);
    const extension = formatToExtension(format);

    const response = await drive.files.export(
      { fileId: presentationId, mimeType },
      { responseType: "arraybuffer" },
    );

    const outputPath = join(process.cwd(), `${presentationId}.${extension}`);
    await writeFile(outputPath, Buffer.from(response.data as ArrayBuffer));

    return { id: presentationId, format, path: outputPath, exported: true };
  };

  return { createPresentation, listSlides, readSlide, exportSlides };
}
