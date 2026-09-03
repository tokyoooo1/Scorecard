const router = require('express').Router();
const multer = require('multer');
const path     = require('path');
const {v4: uuid} = require('uuid');
const candidatectrl = require('../controllers/candidate.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');


/////file uploas(candidate passport)

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './upload/passports'),
    filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
}) 
//1024bytes     = 1kb;
//1024kb        = 1mb;
//              = 5mb
const upload = multer({
    storage,
    limits: {fileSize: 5 * 1024 * 1024 }, //5MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png/;
        if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)){
            cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG images are accepted for passport photos'));
        }
    }

})

router.post('/',                candidatectrl.initiateRegistration);
router.patch('/:id/academic',                candidatectrl.updateAcademicInfo);
router.patch('/:id/center',     candidatectrl.assignExamCenter);
router.post('/:id/photo',       upload.single('photo'), candidatectrl.uploadPassportPhoto);
router.post('/:id/finalize',    candidatectrl.finalizeRegistration);


//-------------------//
router.post('/testupload',                upload.single('photo'), candidatectrl.uploadPassportPhoto);


//-----------Query route (Admin)-------//
router.get('/',     protect, adminOnly, candidatectrl.searchCandidates);
router.get('/stats',        protect, adminOnly, candidatectrl.getRegistrationStats);
router.get('/reg/:regNumber',   protect, adminOnly, candidatectrl.getCandidateByRegNumber)
router.get('/:id',         protect, adminOnly, candidatectrl.getCandidate);
router.patch('/:id',         protect, adminOnly, candidatectrl.adminUpdateCandidate);


///--------//
router.get('/exam-slip/:regNumber/print', candidatectrl.printExaminationSlip)

module.exports = router;