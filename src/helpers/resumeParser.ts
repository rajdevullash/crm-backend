/**
 * Resume Parser - Extracts text content from PDF resumes
 */

import fs from 'fs';
import path from 'path';

/**
 * Parse PDF resume and extract text content
 */
export const parseResume = async (filePath: string): Promise<string> => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Resume file not found: ${filePath}`);
      return '';
    }

    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath);

    // Use dynamic import for pdf-parse
    const { PDFParse } = require('pdf-parse');
    const pdfParser = new PDFParse({ data: dataBuffer });
    
    // Parse PDF and extract text
    const result = await pdfParser.getText();
    const text = result.text;

    console.log(`✅ Parsed resume: ${text.length} characters extracted`);
    return text;
  } catch (error) {
    console.error('Error parsing resume:', error);
    return '';
  }
};

/**
 * Extract text from resume file (supports PDF only for now)
 */
export const extractResumeText = async (resumeUrl: string): Promise<string> => {
  try {
    // resumeUrl is relative path like "/uploads/resumes/filename.pdf"
    // Remove leading slash if present
    const cleanPath = resumeUrl.startsWith('/') ? resumeUrl.substring(1) : resumeUrl;
    const fullPath = path.join(process.cwd(), cleanPath);
    
    console.log(`📄 Attempting to parse resume from: ${fullPath}`);
    
    const ext = path.extname(fullPath).toLowerCase();
    
    if (ext === '.pdf') {
      return await parseResume(fullPath);
    } else {
      console.log(`⚠️  Unsupported file format: ${ext}`);
      return '';
    }
  } catch (error) {
    console.error('Error extracting resume text:', error);
    return '';
  }
};

export default extractResumeText;
