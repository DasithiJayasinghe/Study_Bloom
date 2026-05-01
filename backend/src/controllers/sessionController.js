const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');

// @desc Save a completed study session
// @route POST /api/sessions
// @access Private
exports.createSession = async (req, res) => {
    try {
        const { duration, folderId, startTime, endTime } = req.body;

        const session = await StudySession.create({
            user: req.user._id,
            duration,
            folder: folderId,
            startTime,
            endTime
        });

        res.status(201).json({
            success: true,
            data: session
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Get study stats for the logged-in user
// @route GET /api/sessions/stats
// @access Private
exports.getStats = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);

        // Total seconds today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalSecondsToday = await StudySession.aggregate([
            {
                $match: {
                    user: userId,
                    startTime: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$duration' }
                }
            }
        ]);

        // Stats by folder
        const statsByFolder = await StudySession.aggregate([
            {
                $match: { user: userId }
            },
            {
                $group: {
                    _id: '$folder',
                    totalDuration: { $sum: '$duration' },
                    sessionCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'personal_folders',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'folderDetails'
                }
            },
            {
                $unwind: {
                    path: '$folderDetails',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                todayTotalSeconds: totalSecondsToday.length > 0 ? totalSecondsToday[0].total : 0,
                statsByFolder,
                monthlyStats: await getMonthlyAggregation(userId)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Helper for monthly stats
const getMonthlyAggregation = async (userId) => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    
    const monthlyStats = await StudySession.aggregate([
        {
            $match: {
                user: userId,
                createdAt: { $gte: startOfYear }
            }
        },
        {
            $group: {
                _id: { $month: '$createdAt' },
                totalDuration: { $sum: '$duration' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return monthlyStats.map(stat => ({
        month: monthNames[stat._id - 1],
        hours: Math.round((stat.totalDuration / 3600) * 10) / 10
    }));
};

// @desc Get daily stats for a specific month
// @route GET /api/sessions/stats/daily
// @access Private
exports.getDailyStatsForMonth = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const dailyStats = await StudySession.aggregate([
            {
                $match: {
                    user: userId,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: '$createdAt' },
                    totalDuration: { $sum: '$duration' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Fill in missing days with 0
        const daysInMonth = new Date(year, month, 0).getDate();
        const results = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const found = dailyStats.find(s => s._id === i);
            results.push({
                day: i,
                hours: found ? Math.round((found.totalDuration / 3600) * 100) / 100 : 0
            });
        }

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Get weekly stats for the Study Diary
// @route GET /api/sessions/stats/weekly
// @access Private
exports.getWeeklyStats = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        
        // Start of current week (Monday)
        const now = new Date();
        const monday = new Date(now);
        // getDay() is 0 (Sun) to 6 (Sat)
        // We want 1 (Mon) to be the start.
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const stats = await StudySession.aggregate([
            {
                $match: {
                    user: userId,
                    createdAt: { $gte: monday, $lte: sunday }
                }
            },
            {
                $lookup: {
                    from: 'folders',
                    localField: 'folder',
                    foreignField: '_id',
                    as: 'folderInfo'
                }
            },
            {
                $unwind: { path: '$folderInfo', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    duration: 1,
                    dayOfWeek: { $dayOfWeek: '$createdAt' }, // 1 (Sun) to 7 (Sat)
                    isCozy: {
                        $regexMatch: {
                            input: { $ifNull: ['$folderInfo.name', ''] },
                            regex: /cozy|chill|rest|break|fun|relax/i
                        }
                    }
                }
            },
            {
                $group: {
                    _id: { day: '$dayOfWeek', isCozy: '$isCozy' },
                    totalDuration: { $sum: '$duration' }
                }
            }
        ]);

        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const results = days.map((label, index) => {
            // MongoDB $dayOfWeek: 1(Sun), 2(Mon), 3(Tue), 4(Wed), 5(Thu), 6(Fri), 7(Sat)
            const mongoDay = index === 6 ? 1 : index + 2; 
            
            const studyEntry = stats.find(s => s._id.day === mongoDay && s._id.isCozy === false);
            const cozyEntry = stats.find(s => s._id.day === mongoDay && s._id.isCozy === true);

            return {
                label,
                studyHours: studyEntry ? Math.round((studyEntry.totalDuration / 3600) * 10) / 10 : 0,
                cozyHours: cozyEntry ? Math.round((cozyEntry.totalDuration / 3600) * 10) / 10 : 0
            };
        });

        const totalWeekSeconds = results.reduce((acc, curr) => acc + (curr.studyHours + curr.cozyHours) * 3600, 0);

        res.status(200).json({
            success: true,
            data: {
                weeklyData: results,
                totalHours: Math.round(totalWeekSeconds / 3600),
                goalReach: 84
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc Get monthly stats for the Study Diary (grouped by week)
// @route GET /api/sessions/stats/monthly
// @access Private
exports.getMonthlyStats = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const stats = await StudySession.aggregate([
            {
                $match: {
                    user: userId,
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $lookup: {
                    from: 'folders',
                    localField: 'folder',
                    foreignField: '_id',
                    as: 'folderInfo'
                }
            },
            {
                $unwind: { path: '$folderInfo', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    duration: 1,
                    dayOfMonth: { $dayOfMonth: '$createdAt' },
                    isCozy: {
                        $regexMatch: {
                            input: { $ifNull: ['$folderInfo.name', ''] },
                            regex: /cozy|chill|rest|break|fun|relax/i
                        }
                    }
                }
            }
        ]);

        // Group by week (1-5) in JS for maximum compatibility
        const weeks = [
            { label: 'W1', studySeconds: 0, cozySeconds: 0 },
            { label: 'W2', studySeconds: 0, cozySeconds: 0 },
            { label: 'W3', studySeconds: 0, cozySeconds: 0 },
            { label: 'W4', studySeconds: 0, cozySeconds: 0 },
            { label: 'W5', studySeconds: 0, cozySeconds: 0 }
        ];

        // Calculate first day of month offset for Monday-start calendar weeks
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const dayOfWeek = firstDay.getDay(); // 0(Sun) - 6(Sat)
        const offset = (dayOfWeek + 6) % 7; // Adjust to 0(Mon) - 6(Sun)

        stats.forEach(session => {
            // Calculate week index using the calendar offset
            const weekIndex = Math.min(Math.floor((session.dayOfMonth + offset - 1) / 7), 4);
            
            if (session.isCozy) {
                weeks[weekIndex].cozySeconds += session.duration;
            } else {
                weeks[weekIndex].studySeconds += session.duration;
            }
        });

        const results = weeks.map(w => ({
            label: w.label,
            studyHours: Math.round((w.studySeconds / 3600) * 10) / 10,
            cozyHours: Math.round((w.cozySeconds / 3600) * 10) / 10
        }));

        const totalMonthSeconds = results.reduce((acc, curr) => acc + (curr.studyHours + curr.cozyHours) * 3600, 0);

        res.status(200).json({
            success: true,
            data: {
                monthlyData: results,
                totalHours: Math.round(totalMonthSeconds / 3600)
            }
        });
    } catch (error) {
        console.error('DIARY MONTHLY ERROR:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
