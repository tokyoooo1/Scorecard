const ExamCenter = require('../models/ExamCenter.model');
const api        = require('../utils/apiResponse');
const AppError   = require('../utils/AppError');

//Create exam center
exports.createCenter =  async (req, res, next) => {
    try{
        const center = await ExamCenter.create(req.body);
        api.created(res, {center}, 'Exam center created');
    }catch(err){
        next(err);
    }
}
//get all active exam center
exports.getCenters = async (req, res, next) => {
    try {
        const { state, active, page = 1, limit = 50}  = req.query;
        const filter =  {};
        if (state)  filter.state = state; //{filter: "Lagos"}
        if (active) filter.isActive = active === 'true';

        const [data, total] = await Promise.all([
            ExamCenter.find(filter).sort({ state: 1, name: 1}).skip((page-1)*limit).limit(Number(limit)),
            ExamCenter.countDocuments(filter),
        ]);
        api.paginated(res, {data, total, page: Number(page), limit: Number(limit)});
    } catch (err) {
        next(err);
    }
}

//get centre by center code
exports.getCenterByCode = async (req, res, next) => {
    try {
        //const code = req.params.code
        const center = await ExamCenter.findOne({ centerCode: req.params.code.toUpperCase()});
        if(!center) return next(new AppError('Center not found', 404));
        api.success(res, {center}, 'Center updated')
    } catch (error) {
        next(error);
    }
}

//update center
exports.updateCenter = async (req, res, next) => {
    try {
        const center = await ExamCenter.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
        if (!center) return next(new AppError('Center not founs', 404));
        api.success(res, {center}, 'Center n updated');
    } catch (error) {
        next(error);
    }
}

// get center statistics
exports.getCenterStats = async (req, res, next) => {
    try {
        const stats = await ExamCenter.aggregate([
            {
                $group: {
                    _id:           '$state',
                    totalCenters:   { $sum: 1},
                    totalCapacity:  { $sum: '$capacity'},
                    totalRegistered: {$sum: '$registeredCount' },
                }
            },
            { $sort: {_id: 1}},
        ]);
        api.success(res, { stats });
    } catch (err) {
        next(err);
    }
}