class Listing < ApplicationRecord
  belongs_to :user
  has_many :amenities, through: :listing_amenities
end
