import { NextResponse } from 'next/server';
import { getAnalyticsSummary, getTopImages } from '@/lib/analytics/queries';
import * as xlsx from 'xlsx';
// jspdf is difficult to run precisely on the generic exact edge runtime if it uses DOM/Canvas
// However, in a standard nodejs route, jspdf can sometimes be used server-side or generated client-side.
// For robust server-side PDF generation, puppeteer or pdfkit is standard.
// Since the strategy explicitly dictates `jspdf` and `jspdf-autotable`, the standard approach for those libraries
// is to generate the PDF *Client-Side* rather than Server-Side, because jsPDF heavily relies on window/document.
// 
// So this endpoint will serve the structured *data* to the client, and the client will use jsPDF/xlsx
// or if we really want to serve an XLSX binary from here, we can use the `xlsx` library server-side:

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'xlsx';
  
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  const startDateStr = start.toISOString();
  const endDateStr = end.toISOString();

  const summary = await getAnalyticsSummary(startDateStr, endDateStr);
  const topImages = await getTopImages(startDateStr, endDateStr, 50);

  if (format === 'json') {
    // Return data for the client to generate the PDF via jsPDF.
    return NextResponse.json({ summary, topImages });
  }

  if (format === 'xlsx') {
    const wb = xlsx.utils.book_new();

    // Summary Sheet
    const summarySheet = xlsx.utils.json_to_sheet([
      { Metric: 'Total Page Views', Value: summary.totalViews },
      { Metric: 'Unique Visitors', Value: summary.uniqueVisitors },
      { Metric: 'Total Downloads', Value: summary.totalDownloads },
      { Metric: 'Download Rate / Visitor', Value: summary.downloadRatePerVisitor }
    ]);
    xlsx.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Top Images Sheet
    const topImagesFormatted = topImages.map((img: any) => ({
      Filename: img.filename,
      Album: img.album_name,
      Views: img.views,
      Downloads: img.downloads,
      'Conversion Rate %': img.downloadRatePercent
    }));
    const imagesSheet = xlsx.utils.json_to_sheet(topImagesFormatted);
    xlsx.utils.book_append_sheet(wb, imagesSheet, 'Top Images');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="brutal_fruit_analytics_report.xlsx"'
      }
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}
