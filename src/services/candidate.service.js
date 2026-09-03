const { REGISTRATION_STATUS, COMPULSORY_SUBJECT } = require('../config/constants');
const Candidate = require('../models/Candidate.model');
const ExamCenter = require('../models/ExamCenter.model');
const AppError = require('../utils/AppError');
const { generateRegNumber } = require('../utils/generateRegNumber');

class CandidateService {
    //-- Step 1: Initiation of registration

    async initiateRegistration (data) {
        const { email, phone, nin} = data;

        const existing = await Candidate.findOne({
            $or: [{ email }, { phone }, ...(nin ? [{ nin }] : [])],
            examYear: data.examYear || parseInt(process.env.EXAM_YEAR),
        });
        if (existing){
            const field = existing.email === email ? 'email'
                        : existing.phone === phone ? 'phone'
                        : 'NIN';
                throw new (`Candidate with this ${field} already exist for this year`, 409);
        }

        const profileCode = `CD-${nin}`; //generateProfileCode()

        const candidate = await Candidate.create({
            ...data,
            profileCode,
            examYear: data.examYear || parseInt(process.env.EXAM_YEAR),
            registrationStatus: REGISTRATION_STATUS.INITIATED,
            completedSteps: {personalInfo: true}
        });

        return candidate;
    }

    //n step2 for Academic infomation
    async updateAcademicInfo (profileCode, data){
        const {subjects, institutionChoices, oLevelResults, examType} = data;
        if (!subjects){
            throw new Error('Subjects are required');
        };
        if (!subjects.includes(COMPULSORY_SUBJECT)){
            throw new Error(`${COMPULSORY_SUBJECT} must be selected`);
        };
        if(subjects.length !== 4){
            throw new Error('You must select 4 Subjects');
        };
        const uniqueSubjects = new Set(subjects);
        if(uniqueSubjects.size !=4){
            throw new Error('Duplicate subjects not allowed')
        }

        const candidate = await Candidate.findOneAndUpdate( profileCode, {
            subjects,
            institutionChoices,
            oLevelResults,
            examType,
            'completedSteps.academicInfo': true,
            'completedSteps.subjectSelection': true,
            registrationStatus: REGISTRATION_STATUS.INCOMPLETE
        },
         {new: true, runValidator: true}
);

if (!candidate) throw new Error('No candidate with the profileCode');

return candidate;

    }

//step 3: Assign exam center

async assignExamCenter(profileCode, centerCode){
     const center = await ExamCenter.findOne({centerCode, isActive: true});
     if(!center) throw new Error('Exam center not found or inactive');
     if(center.isFull) throw new Error('Exam center is fully booked');

     const candidate = await Candidate.findByIdAndUpdate(
            profileCode,
            {
                examCenter:         center._id,
                examCenterCode:     center.centerCode,
                examCenterName:     center.name,
                'completedSteps.centerSelection': true
            },   
            {new: true}
     );

     if(!candidate) throw new Error('Candidate not fund');

     await ExamCenter.findByIdAndUpdate(center._id, {$inc: {registeredCount: 1}});
     return candidate;
}
// async assignExamCenter(profileCode, centerCode) {
//   const cleanProfileId = typeof profileCode === 'object' && profileCode.id 
//     ? profileCode.id 
//     : profileCode;

//   const center = await ExamCenter.findOne({ centerCode, isActive: true });
//   if (!center) throw new Error('Exam center not found or inactive');
//   if (center.isFull) throw new Error('Exam center is fully booked');

//   const candidate = await Candidate.findByIdAndUpdate(
//     cleanProfileId, 
//     {
//       examCenter: center._id,
//       examCenterCode: center.centerCode,
//       examCenterName: center.name,
//       'completedSteps.centerSelection': true
//     },
//     { new: true }
//   );

//   if (!candidate) throw new Error('Candidate not found');

//   await ExamCenter.findByIdAndUpdate(center._id, { $inc: { registeredCount: 1 } });
  
//   return candidate;
// }

//step 4 upload passport

// async updatePassportPhoto(candidateId, photoData){
//     console.log("Photodata", photoData);
//     const candidate = await Candidate.findByIdAndUpdate(
//         candidateId,
//         {
//             passport: photoData,
//             'completedSteps.photoUpload': true,
//         },
//         {new: true}
//     );
//     if(!candidate) throw new Error('Candidate not found');

//     return candidate;
// }

async updatePassportPhoto (candidateId, photoData) {
  
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) throw new AppError('Candidate not found', 404);

  candidate.passportPhoto = photoData;
  candidate.completedSteps.photoUpload = true;

  await candidate.save();
  
  return candidate;
}
//--step 5 -----
async finalizeRegistration (candidateId){
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) throw new AppError('Candidate not found', 404);

    const steps = candidate.completedSteps;
    const incomplete = Object.entries(steps).filter(([key, done]) => key !== 'payment' && !done).map(([key])=> key);
//['cpersonalInfo, photoupload, ']
    if (incomplete.length){
        throw new AppError(`Imcomplete registration: ${incomplete.join(', ')}`, 400 );
    }
    
    if (candidate.registrationStatus === REGISTRATION_STATUS.COMPLETE){
        throw new AppError('Registration is already completed', 400);
    }

    const registrationNumber =  await generateRegNumber(
        candidate.stateOfOrigin, 
        candidate.gender,
    );
    const updated = await Candidate.findByIdAndUpdate(
        candidateId,
        {
            registrationNumber,
            registrationStatus:  REGISTRATION_STATUS.COMPLETE,
            'completedSteps.payment': true,
        },
        {new: true}
    ).populate('examCenter');

    return updated;
}

// ── Queries ────────────────────────────────────────────────────
  async findById (id) {
    const c = await Candidate.findById(id).populate('examCenter');
    if (!c) throw new AppError('Candidate not found', 404);
    return c;
  }

  async findByRegNumber (regNumber) {
    const c = await Candidate.findOne({ registrationNumber: regNumber.toUpperCase() })
      .populate('examCenter');
    if (!c) throw new AppError('Registration number not found', 404);
    return c;
  }

  async search ({ query, state, status, year, page = 1, limit = 20 }) {
    const filter = { examYear: year || parseInt(process.env.EXAM_YEAR) };
    if (state)  filter.stateOfOrigin       = state;
    if (status) filter.registrationStatus  = status;
    if (query) {
      filter.$or = [
        { registrationNumber: new RegExp(query, 'i') },
        { email:              new RegExp(query, 'i') },
        { firstName:          new RegExp(query, 'i') },
        { lastName:           new RegExp(query, 'i') },
        { phone:              new RegExp(query, 'i') },
      ];
    }

    const [data, total] = await Promise.all([
      Candidate.find(filter)
        .select('-password -emailVerifyToken')
        .populate('examCenter', 'name centerCode state')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Candidate.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async getStats (examYear) {
    const year = examYear || parseInt(process.env.EXAM_YEAR);
    const [statusBreakdown, stateBreakdown, genderBreakdown, total] = await Promise.all([
      Candidate.aggregate([
        { $match: { examYear: year } },
        { $group: { _id: '$registrationStatus', count: { $sum: 1 } } },
      ]),
      Candidate.aggregate([
        { $match: { examYear: year } },
        { $group: { _id: '$stateOfOrigin', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Candidate.aggregate([
        { $match: { examYear: year } },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]),
      Candidate.countDocuments({ examYear: year }),
    ]);

    return { total, statusBreakdown, stateBreakdown, genderBreakdown };
  }

}

module.exports = new CandidateService();