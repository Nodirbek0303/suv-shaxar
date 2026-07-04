import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { MonitoringService } from '../monitoring/monitoring.service';

@Injectable()
export class ReportsService {
  constructor(private readonly monitoring: MonitoringService) {}

  async exportExcel(regionId?: string): Promise<Buffer> {
    const overview = await this.monitoring.getOverview(regionId);
    const regions = await this.monitoring.getRegionComparison();
    const trends = await this.monitoring.getTrends(regionId, undefined, 30);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Samarqand Aqlli Sug\'orish';

    const overviewSheet = workbook.addWorksheet('Umumiy');
    overviewSheet.addRows([
      ['Ko\'rsatkich', 'Qiymat'],
      ['Jami liniyalar', overview.totalLines],
      ['Sarf etilgan suv (m³)', overview.waterUsedM3],
      ['Tejalgan suv (m³)', overview.waterSavedM3],
      ['Tejalgan suv (%)', overview.waterSavedPercent],
      ['O\'simliklar holati', overview.plantHealthLevel],
      ['O\'simliklar indeksi', overview.plantHealthScore],
    ]);

    const regionSheet = workbook.addWorksheet('Hududlar');
    regionSheet.addRow([
      'Hudud',
      'Liniyalar',
      'Sarf (m³)',
      'Tejam (m³)',
      'Holat indeksi',
      'Holat',
    ]);
    for (const r of regions) {
      regionSheet.addRow([
        r.name,
        r.lineCount,
        r.waterUsedM3,
        r.waterSavedM3,
        r.plantHealthScore,
        r.plantHealthLevel,
      ]);
    }

    const trendSheet = workbook.addWorksheet('Trend');
    trendSheet.addRow(['Sana', 'Sarf (m³)', 'Tejam (m³)', 'Holat']);
    for (const t of trends) {
      trendSheet.addRow([
        t.periodStart,
        t.waterUsedM3,
        t.waterSavedM3,
        t.plantHealthScore,
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportPdf(regionId?: string): Promise<Buffer> {
    const overview = await this.monitoring.getOverview(regionId);
    const regions = await this.monitoring.getRegionComparison();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fillColor('#003087')
        .fontSize(11)
        .text("SAMARQAND VILOYATI HOKIMIYATI", { align: 'center' });
      doc.fillColor('#00AEEF')
        .fontSize(10)
        .text("Aqlli sug'orish monitoring tizimi", { align: 'center' });
      doc.moveDown();
      doc.fillColor('#0f172a')
        .fontSize(16)
        .text("Rasmiy hisobot — sug'orish tarmog'i", { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10)
        .fillColor('#64748b')
        .text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, {
          align: 'center',
        });
      doc.moveDown();
      doc.fillColor('#0f172a').fontSize(12);
      doc.text(`Jami liniyalar: ${overview.totalLines}`);
      doc.text(`Sarf etilgan suv: ${overview.waterUsedM3.toFixed(1)} m³`);
      doc.text(
        `Tejalgan suv: ${overview.waterSavedM3.toFixed(1)} m³ (${overview.waterSavedPercent}%)`,
      );
      doc.text(
        `O'simliklar holati: ${overview.plantHealthLevel} (${overview.plantHealthScore})`,
      );
      doc.moveDown();
      doc.fontSize(13).fillColor('#003087').text("Hududlar bo'yicha:");
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#0f172a');
      for (const r of regions) {
        doc.text(
          `${r.name}: ${r.lineCount} liniya, tejam ${r.waterSavedM3.toFixed(1)} m³, holat ${r.plantHealthLevel}`,
        );
      }
      doc.moveDown(2);
      doc.fontSize(9)
        .fillColor('#94a3b8')
        .text("Faqat axborot maqsadida. Operatsion aralashuv uchun mo'ljallanmagan.", {
          align: 'center',
        });

      doc.end();
    });
  }
}
