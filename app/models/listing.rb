class Listing < ApplicationRecord
  belongs_to :user
  has_many :bookings
  has_many :listing_amenities
  has_many :amenities, :through => :listing_amenities
end
