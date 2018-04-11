class Listing < ApplicationRecord
  belongs_to :user
  has_many :bookings
  has_many :listing_amenities
  has_many :amenities, :through => :listing_amenities
  has_one :owner, class_name: User
  
  # Return booked dates for listing
  # Dates where this listing is unavailable
  def booked_dates
    dates = []
    bookings.each do |date|
      range = (date.checkin..date.checkout).to_a
        range.each do |interval| 
          dates << interval.strftime("%Y-%m-%d")
        end
    end
    return dates.uniq
  end
end