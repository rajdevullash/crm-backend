/**
 * Resume Parser - Extracts text content from PDF resumes
 */

import fs from 'fs';
import path from 'path';

/**
 * Extract text from PDF resume file
 */
export const extractResumeText = async (resumeUrl: string): Promise<string> => {
  try {
    // Clean path and get full file path
    const cleanPath = resumeUrl.startsWith('/') ? resumeUrl.substring(1) : resumeUrl;
    const fullPath = path.join(process.cwd(), cleanPath);
    
    console.log(`📄 Parsing resume: ${fullPath}`);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Resume file not found: ${fullPath}`);
      return '';
    }

    // Check file extension
    const ext = path.extname(fullPath).toLowerCase();
    if (ext !== '.pdf') {
      console.log(`⚠️  Unsupported file format: ${ext}`);
      return '';
    }

    // Read PDF file
    const dataBuffer = fs.readFileSync(fullPath);

    // Try to parse with pdf-parse
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(dataBuffer);
      const text = data.text || '';
      
      if (text.length > 0) {
        console.log(`✅ Parsed resume: ${text.length} characters extracted`);
        return text;
      }
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      
      // If pdf-parse fails due to browser API issues, use basic extraction
      if (errorMessage.includes('DOMMatrix') || errorMessage.includes('ImageData') || errorMessage.includes('Path2D')) {
        console.log('⚠️  pdf-parse has browser API issues. Using basic text extraction...');
        return extractBasicTextFromPDF(dataBuffer);
      }
      
      throw parseError;
    }

    // Fallback to basic extraction if pdf-parse returns empty
    return extractBasicTextFromPDF(dataBuffer);
  } catch (error) {
    console.error('Error extracting resume text:', error);
    return '';
  }
};

/**
 * Basic text extraction from PDF (fallback method)
 */
const extractBasicTextFromPDF = (buffer: Buffer): string => {
  try {
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 500000));
    let extractedText = '';
    
    // Method 1: Extract text between parentheses (common PDF text format)
    const parenMatches = text.match(/\((.*?)\)/g) || [];
    const parenText = parenMatches
      .map(match => {
        const content = match.slice(1, -1);
        return content
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
      })
      .filter(str => str.length > 1 && /[a-zA-Z0-9]/.test(str))
      .join(' ');
    
    extractedText += parenText + ' ';
    
    // Method 2: Extract text from BT...ET blocks (PDF text objects)
    const btMatches = text.match(/BT[\s\S]*?ET/g) || [];
    const btText = btMatches
      .map(block => {
        const blockMatches = block.match(/\((.*?)\)/g) || [];
        return blockMatches
          .map(m => {
            const content = m.slice(1, -1);
            return content
              .replace(/\\n/g, ' ')
              .replace(/\\r/g, ' ')
              .replace(/\\t/g, ' ')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\');
          })
          .filter(str => str.length > 1)
          .join(' ');
      })
      .filter(str => str.length > 0)
      .join(' ');
    
    extractedText += btText;
    
    // Clean up extracted text
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:!?()]/g, ' ')
      .trim();
    
    if (cleanedText.length > 0) {
      console.log(`✅ Extracted basic text: ${cleanedText.length} characters`);
    }
    
    return cleanedText;
  } catch (error) {
    console.error('Error in basic text extraction:', error);
    return '';
  }
};

export default extractResumeText;
