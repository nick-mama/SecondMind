declare module "pdf-parse-fork" {
  function pdfParse(buffer: Buffer): Promise<{
    text: string;
    numpages: number;
    info: unknown;
  }>;
  export default pdfParse;
}
