const Venues=require('../data/venue')
exports.getVenues=async(filters)=>{
  const { city,guestCount,budget,eventDate,amenities}=filters
  const results =Venues.filter((venue)=>{
  const isCityMatch= venue.city.toLowerCase()===city.toLowerCase()
  const isCapacityMatch = venue.capacity >= guestCount
  const isBudgetMatch = venue.pricePerDay <= budget;
  const isAvailable = eventDate  ? !venue.bookedDates.includes(eventDate) : true;
  const hasAmenities = amenities.length === 0 || amenities.every((item) => 
      venue.amenities.includes(item)
    );
  return isCityMatch && isCapacityMatch && isBudgetMatch && isAvailable && hasAmenities;
  });



return results.sort((a, b) => b.rating - a.rating);}
