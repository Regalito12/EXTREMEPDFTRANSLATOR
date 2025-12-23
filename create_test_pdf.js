const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test_doc.pdf'));
doc.fontSize(12).text(`
Hello Chutes AI. This is a longer text to ensure the PDF translator does not think this is a scanned document.
We need more than 100 characters to pass the validation check.
So here is some random text to fill the space.
Translation is a complex process that involves understanding the source text and recreating it in the target language.
We hope this test works perfectly now.
Thank you for your cooperation.
`, 100, 100);
doc.end();
console.log('PDF Created');
