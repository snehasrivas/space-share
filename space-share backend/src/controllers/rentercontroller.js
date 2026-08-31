const matcherService = require('../services/matcherServices');

exports.userQuery = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { city, guestCount, maxBudget, eventDate, amenities } = req.body;
   // if entry is not filled
  
    if (!city || guestCount === undefined || maxBudget === undefined) {
      return res.status(400).json({
        success: false,
        message: "Incomplete information: city, guestCount, and maxBudget are required."
      });
    }
   // conversion from string to number
   
    const parsedGuestCount = Number(guestCount);
    const parsedBudget = Number(maxBudget);

    if (isNaN(parsedGuestCount) || isNaN(parsedBudget)) {
      return res.status(400).json({
        success: false,
        message: "guestCount and maxBudget must be valid numbers."
      });
    }

    
    const matchedLawns = await matcherService.getVenues({
      city,
      guestCount: parsedGuestCount,
      budget: parsedBudget, 
      eventDate,
      amenities: Array.isArray(amenities) ? amenities : []
    });

    // 4. Response
    return res.status(200).json({
      success: true,
      totalMatches: matchedLawns.length,
      data: matchedLawns
    });

  } catch (error) {
    next(error);
  }
};
