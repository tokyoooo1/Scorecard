const PDFDocument = require('pdfkit');
const QRCode      = require('qrcode');
const path        = require('path');
const fs          = require('fs');


class PDFService {
    //--- <Main Entry> ------\

    /////
     async generateResultSlip (result, res) {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="result-${result.registrationNumber}.pdf"`
    );
    doc.pipe(res);

    await this._buildResultSlip(doc, result);
    doc.end();
  };
     // ── Result Slip Builder ───────────────────────────────────────
  async _buildResultSlip (doc, result) {
    const { candidate, subjectScores, aggregateScore, grade, remarks } = result;
    const c = candidate;
    const W = 595 - 100; // usable width

    // ── Header ──────────────────────────────────────────────────
    this._drawHeader(doc, 'ADMISSIONS AND MATRICULATION BOARD', 'UTME RESULT SLIP');

    // ── QR code for verification ─────────────────────────────────
    const qrData = JSON.stringify({
      regNo:     result.registrationNumber,
      year:      result.examYear,
      aggregate: aggregateScore,
      grade,
      verify:    `${process.env.APP_URL}/api/v1/public/verify/${result.registrationNumber}`,
    });
    const qrBuffer = await QRCode.toBuffer(qrData, { width: 80, margin: 1 });

    // Place QR top-right
    doc.image(qrBuffer, 495, 55, { width: 70 });
    doc.fontSize(6).fillColor('#666').text('Scan to verify', 495, 127, { width: 70, align: 'center' });

    // ── Passport photo placeholder ────────────────────────────────
    const photoY = 155;
    if (c.passportPhoto?.url && fs.existsSync(c.passportPhoto.url)) {
      doc.image(c.passportPhoto.url, 50, photoY, { width: 80, height: 96 });
    } else {
      doc.rect(50, photoY, 80, 96).stroke('#ccc');
      doc.fontSize(7).fillColor('#aaa').text('PHOTO', 50, photoY + 42, { width: 80, align: 'center' });
    }

    // ── Candidate details ─────────────────────────────────────────
    const detailsX = 145;
    let   detailsY = 155;
    const lineH    = 18;

    const fields = [
      ['Registration Number', result.registrationNumber],
      ['Full Name',           `${c.lastName?.toUpperCase()} ${c.firstName} ${c.middleName || ''}`],
      ['Date of Birth',       new Date(c.dateOfBirth).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })],
      ['Gender',              c.gender],
      ['State of Origin',     c.stateOfOrigin],
      ['Exam Center',         `${result.examCenterCode} — ${result.examCenter?.name || ''}`],
      ['Exam Date',           result.examDate ? new Date(result.examDate).toLocaleDateString('en-GB') : 'N/A'],
      ['Exam Type',           result.examType],
    ];

    fields.forEach(([label, value]) => {
      doc.fontSize(8).fillColor('#555').text(`${label}:`, detailsX, detailsY, { width: 110 });
      doc.fontSize(8.5).fillColor('#111').text(String(value || 'N/A'), detailsX + 115, detailsY, { width: W - 115 });
      detailsY += lineH;
    });

    // ── Scores table ─────────────────────────────────────────────
    const tableY = 280;
    this._sectionTitle(doc, 'EXAMINATION SCORES', tableY);

    const tY = tableY + 22;
    const cols = { subject: 50, score: 350, grade: 430, remark: 480 };

    // Table header
    doc.rect(50, tY, W, 20).fill('#1a365d');
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('Subject',   cols.subject, tY + 5, { width: 290 });
    doc.text('Score',     cols.score,   tY + 5, { width: 70, align: 'center' });
    doc.text('Grade',     cols.grade,   tY + 5, { width: 45, align: 'center' });
    doc.text('Remark',    cols.remark,  tY + 5, { width: 80 });

    // Table rows
    let rowY = tY + 20;
    subjectScores.forEach((s, i) => {
      const bg = i % 2 === 0 ? '#f7f9fc' : '#ffffff';
      doc.rect(50, rowY, W, 22).fill(bg);

      const score = s.scaledScore ?? s.rawScore;
      const scoreColor = score >= 70 ? '#276749' : score >= 50 ? '#744210' : '#c53030';

      doc.fillColor('#222').fontSize(9).font('Helvetica');
      doc.text(s.subject,     cols.subject, rowY + 6, { width: 290 });
      doc.fillColor(scoreColor).text(String(score), cols.score, rowY + 6, { width: 70, align: 'center' });
      doc.fillColor('#1a365d').text(s.grade || '-',  cols.grade, rowY + 6, { width: 45, align: 'center' });
      doc.fillColor('#444').text(s.remarks || '-',   cols.remark, rowY + 6, { width: 80 });

      // Border bottom
      doc.moveTo(50, rowY + 22).lineTo(50 + W, rowY + 22).strokeColor('#e2e8f0').stroke();
      rowY += 22;
    });

    // Total row
    doc.rect(50, rowY, W, 26).fill('#1a365d');
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
    doc.text('AGGREGATE SCORE', cols.subject, rowY + 7, { width: 290 });
    doc.text(String(aggregateScore), cols.score, rowY + 7, { width: 70, align: 'center' });
    doc.text(grade,                  cols.grade, rowY + 7, { width: 45, align: 'center' });

    rowY += 40;

    // ── Grade summary box ─────────────────────────────────────────
    const passColor = aggregateScore >= 140 ? '#276749' : '#c53030';
    const passLabel = aggregateScore >= 140 ? 'PASSED' : 'FAILED';

    doc.roundedRect(50, rowY, W / 2 - 10, 60, 4)
       .strokeColor('#e2e8f0').lineWidth(1).stroke();

    doc.fontSize(10).fillColor('#444').text('Overall Performance', 60, rowY + 8);
    doc.fontSize(22).fillColor(passColor).font('Helvetica-Bold')
       .text(passLabel, 60, rowY + 24);
    doc.fontSize(9).fillColor('#666').font('Helvetica')
       .text(`${remarks} — Score: ${aggregateScore}/400`, 60, rowY + 50);

    // Grade scale reference
    doc.roundedRect(50 + W / 2 + 10, rowY, W / 2 - 10, 60, 4)
       .strokeColor('#e2e8f0').stroke();
    doc.fontSize(8).fillColor('#444')
       .text('Grade Scale: A(300-400) B(250-299) C(200-249) D(160-199) E(140-159) F(0-139)',
             60 + W / 2 + 10, rowY + 20, { width: W / 2 - 30 });

    // ── Institution choices ───────────────────────────────────────
    if (candidate.institutionChoices?.length) {
      rowY += 80;
      this._sectionTitle(doc, 'INSTITUTION CHOICES', rowY);
      rowY += 22;
      candidate.institutionChoices.forEach((ch, i) => {
        doc.fontSize(8.5).fillColor('#111').font('Helvetica-Bold')
           .text(`${i === 0 ? '1st' : '2nd'} Choice:`, 50, rowY);
        doc.font('Helvetica').fillColor('#444')
           .text(`${ch.institutionName} — ${ch.course} (${ch.courseCode})`, 130, rowY);
        rowY += 16;
      });
    }

    // ── Footer ────────────────────────────────────────────────────
    this._drawFooter(doc, result.registrationNumber);
  }
    /////

    ////Admission Letter
     async generateAdmissionLetter (candidate, result, res) {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admission-letter-${candidate.registrationNumber}.pdf"`
    );
    doc.pipe(res);
    await this._buildAdmissionLetter(doc, candidate, result);
    doc.end();
  }

   // ── Admission Letter Builder ──────────────────────────────────
  async _buildAdmissionLetter (doc, candidate, result) {
    const W = 595 - 100;
    this._drawHeader(doc, 'JOINT ADMISSIONS AND MATRICULATION BOARD', 'ADMISSION STATUS LETTER');

    let y = 155;
    doc.fontSize(10).fillColor('#111').font('Helvetica-Bold')
       .text('TO WHOM IT MAY CONCERN', 50, y);
    y += 30;

    doc.fontSize(10).fillColor('#333').font('Helvetica')
       .text(`This is to certify that the underlisted candidate has been considered for admission into `, 50, y, { continued: true })
       .font('Helvetica-Bold')
       .text(candidate.institutionChoices?.[0]?.institutionName || 'N/A')
       .font('Helvetica')
       .text(` to study `)
       .font('Helvetica-Bold')
       .text(candidate.institutionChoices?.[0]?.course || 'N/A')
       .font('Helvetica')
       .text(` based on the UTME score obtained.`);

    y = doc.y + 25;

    const details = [
      ['Full Name',           candidate.fullName?.toUpperCase()],
      ['Registration Number', candidate.registrationNumber],
      ['Aggregate Score',     `${result.aggregateScore}/400 (${result.grade} — ${result.remarks})`],
      ['Admission Status',    result.admissionStatus?.toUpperCase().replace('_', ' ')],
      ['Institution',         candidate.institutionChoices?.[0]?.institutionName],
      ['Course',              candidate.institutionChoices?.[0]?.course],
    ];

    details.forEach(([lbl, val]) => {
      doc.rect(50, y, W, 24).fill(doc.y % 2 === 0 ? '#f7f9fc' : '#fff');
      doc.fontSize(9).fillColor('#555').text(`${lbl}:`, 60, y + 6, { width: 130 });
      doc.fontSize(9).fillColor('#111').font('Helvetica-Bold').text(String(val || 'N/A'), 200, y + 6, { width: W - 160 });
      doc.font('Helvetica');
      y += 24;
    });

    y += 30;
    doc.fontSize(9).fillColor('#444')
       .text('Note: This letter is computer-generated and does not require a signature. ' +
             'Scan the QR code or visit our website to verify the authenticity of this document.',
             50, y, { width: W });

    const qrBuffer = await QRCode.toBuffer(
      `${process.env.APP_URL}/verify/${candidate.registrationNumber}`,
      { width: 80 }
    );
    doc.image(qrBuffer, 50, doc.y + 20, { width: 80 });

    this._drawFooter(doc, candidate.registrationNumber);
  }
    ////Admission Letter end

    async generateExaminationSlip(candidate, res){
        const doc =  new PDFDocument({ size: 'A4', margin: 50, bufferPages: true});
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="exam-slip-${candidate.registrationNumber}.pdf`
        );
        doc.pipe(res);
        await this._buildExamSlip(doc, candidate);
        doc.end();
    };
    //_drawHeader --REMEBER
    async _buildExamSlip(doc, candidate) {
        const W = 595 - 100;
       
        this._drawHeader(doc, 'SCORE CARD EXAMINATION BOARD', 'EXAMINATION ATTENDANCE SLIP' );

        //QR code
        const qrBuffer = await QRCode.toBuffer(candidate.registrationNumber, { width: 80, margin: 1});
        doc.image(qrBuffer, 495, 55, { width: 70});

        let y = 155

        //Passport
        if (candidate.passport?.url && fs.existsSync(candidate.passport.url)){
            doc.image(candidate.passport.url, 50, y, { width: 90, height: 108});
        } else {
            doc.rect(50, y, 90, 108).stroke('#ccc');
            doc.fontSize(7).fillColor('#aaa').text('PASSPORT', 50, y + 48, { width: 90, align: 'center'});
        }

        const dx = 155;
        const dw = W - 105;
        const rows = [
            ['Registration Number',     candidate.registrationNumber],
            ['Candidate Name',          candidate.fullName?.toUpperCase()],
            ['Date of Birth',           new Date(candidate.dateOfBirth).toLocaleDateString('en-GB')],
            ['Gender',                 candidate.gender],
            ['State of Origin',        candidate.stateOfOrigin],
            ['Exam Center',            `${candidate.examCenterCode} - ${candidate.examCenterName}`],
            ['Exam Date',              candidate.scheduleDate? new Date(candidate.scheduleDate).toLocaleDateString('en-GB'): 'TBC'],
            ['Exam Time',              candidate.scheduleTime || 'TBC'],
            ['Seat Number',            candidate.seatNumber  || 'TBC'],
        ];
      rows.forEach(([lbl, val]) => {
        doc.fontSize(8).fillColor('#555').text(`${lbl}:`, dx, y, {width: 120});
        doc.fontSize(9).fillColor('#111').font('Helvetica-Bold').text(String(val || 'N/A'), dx + 125, y, {width: dw - 125});
        doc.font('Helvetica');
        y += 18;
      });
      
      y = 295
      this._sectionTitle(doc, 'SUBJECTS', y);
      y += 22;

      candidate.subjects?.forEach((subj, i)=>{
        doc.rect(50, y, W, 22).fill(i % 2 === 0? '#f7f9fc' : '#fff');
        doc.fontSize(9).fillColor('#222').text(`${i + 1}. ${subj}`, 60, y + 6);
        y += 22;
      });

      //Instruction
      y += 15;
      this._sectionTitle(doc, "IMPORTANT INSTRUCTION", y);
      y += 22;

      const instructions  = [
        'Arrive at the examination Center atg least 30 minutes before your scheduled time.',
        'Bring this and a valid means of identification (NIN)',
         'No electronic devices including mobile phones allowed in the examination hall.',
         'Candidates must not leave the hall until 30 minute. after the examination has commenced',
         'Any candidate caught with prohibited items will be disqualified and prosecuted.',
      ];

      instructions.forEach((instr, i) => {
        doc.fontSize(8).fillColor('#333').text(`${i + 1}. ${instr}`, 50, y, { width: W});
        y += 18;
      });

      this._drawFooter(doc, candidate.registrationNumber);
    }
    _drawHeader(doc, org, title){
        doc.rect(50, 45, 495, 8).fill('#008751');
        doc.rect(218, 45, 159, 8).fill('#ffffff');

        doc.fontSize(14).fillColor('#1a365d').font('Helvetica-Bold').text(org, 50, 60, {align: 'center', width: 495});

        doc.fontSize(14).fillColor('#c53030').font('Helvetica-Bold').text(org, 50, 60, {align: 'center', width: 495});

        doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#1a365d').lineWidth(1.5).stroke();
        doc.fontSize(7.5).fillColor('#666').font('Helvetica-Bold').text(
            `Generated: ${new Date().toLocaleString('en-GB')} | ${process.env.APP_NAME }  |  ${process.env.APP_URL}`,
            50, 104, {align: 'center', width: 495});
    
      doc.moveTo(50, 118).lineTo(545, 118).strokeColor('#e2e8f0').lineWidth(0.5).stroke()

    }
    _sectionTitle(doc, text, y){
        doc.rect(50, y, 495, 19).fill('#1a365d');
        doc.fontSize(9).fillColor('white').font('Helvetica-Bold').text(text, 57, y + 5);
        doc.font('Helvetica');
    }
    _drawFooter (doc, regNumber){
        const pageCount = doc.bufferedPageRange().count;
        for (let i =0; i < pageCount; i++) {
            doc.switchToPage(i);
            const y = doc.page.height - 55;
            doc.moveTo(50, y).lineTo(545, y).strokeColor('#1a365d').lineWidth(0.8).stroke();
            doc.fontSize(7).fillColor('#666')
            .text(
                `${process.env.APP_NAME} | Registration: ${regNumber} | ` + 
                `This document is official and valid fo presentation to institution.`, 50, y + 6, {align: 'center', width: 495}
            );
            doc.text(`Page ${i + 1} of ${pageCount}`, 50,  y + 18, {align: 'right', width: 495})
           
        }
    }
}

module.exports = new PDFService();