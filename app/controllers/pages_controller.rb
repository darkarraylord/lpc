class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [:home]

  def home
    @listings = Listing.all
  end
  
  def bookings
    @bookings = Booking.all
  end
  
end
