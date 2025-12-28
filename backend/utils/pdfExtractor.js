const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist');

// Disable worker to avoid external file requirement in simple Node environments
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;
}

async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(dataBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array, useSystemFonts: true });
    const pdfDocument = await loadingTask.promise;

    let textItems = [];
    let fullText = "";

    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // pdfjs-dist styles can contain font info
      const styles = textContent.styles || {};

      // Transform text items to our format
      const items = textContent.items.map(item => {
        const [scaleX, , , scaleY, x, y] = item.transform;

        // Try to infer color (pdfjs doesn't give it easily in getTextContent, but placeholders help for future expansions)
        // In professional setups, one would use getOperatorList for color.
        const style = styles[item.fontName] || {};

        return {
          text: item.str,
          x: x,
          y: y,
          width: item.width,
          height: item.height || scaleY,
          fontSize: scaleY,
          fontName: item.fontName,
          isSerif: (item.fontName && /Serif|Times|Roman|Georgia|Cambria|Palatino/i.test(item.fontName)),
          color: item.color || [0, 0, 0], // Default black, placeholder for expansion
          pageIndex: i - 1,
          viewport: {
            width: viewport.width,
            height: viewport.height
          }
        };
      });

      // Group items that are part of the same line or very close
      // This is basic Smartcat-style "item merging"
      const groupedItems = groupCloseItems(items);
      textItems = textItems.concat(groupedItems);

      groupedItems.forEach(group => {
        // Clean each item to avoid phonetic/hidden junk
        group.text = group.text.replace(/[^\x20-\x7E\xA1-\xFF\u00C0-\u017F]/g, ' ').trim();
        fullText += group.text + " ";
      });
      fullText += "\n";
    }

    let cleanText = fullText.trim();
    const isLikelyScanned = (
      cleanText.length < 50 ||
      (pdfDocument.numPages > 1 && cleanText.length / pdfDocument.numPages < 10)
    );

    if (isLikelyScanned && cleanText.length < 20) {
      console.warn('PDF appears to be scanned based on content analysis');
      throw new Error('El PDF parece ser escaneado o tiene capas de texto insuficientes.');
    }

    return {
      text: cleanText,
      items: textItems,
      pages: pdfDocument.numPages,
      source: 'pdf'
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    if (error.message.includes('escaneado')) throw error;
    throw new Error('No se pudo extraer el texto del PDF detalladamente.');
  }
}

/**
 * Groups PDF text items that are horizontally close and on the same line.
 * Improves translation quality by providing more context per "item".
 */
function groupCloseItems(items) {
  if (items.length <= 1) return items;

  // Sort by page (already mostly sorted) then Y (decending) then X
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
    return a.x - b.x;
  });

  const result = [];
  let currentGroup = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];

    // Check if on same line (within 3 points) and close horizontally (within 10 points)
    const isSameLine = Math.abs(item.y - currentGroup.y) < 3;
    const isCloseX = (item.x - (currentGroup.x + currentGroup.width)) < 15;

    if (isSameLine && isCloseX) {
      currentGroup.text += (currentGroup.text.endsWith(' ') || item.text.startsWith(' ') ? '' : ' ') + item.text;
      currentGroup.width = (item.x + item.width) - currentGroup.x;
    } else {
      result.push(currentGroup);
      currentGroup = item;
    }
  }
  result.push(currentGroup);
  return result;
}

module.exports = {
  extractTextFromPDF
};