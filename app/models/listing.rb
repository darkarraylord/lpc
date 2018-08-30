class Listing < ApplicationRecord
  belongs_to :user
  has_many :bookings
  has_many :listing_amenities
  has_many :amenities, :through => :listing_amenities
  has_one :owner, class_name: 'User'
  has_many :reviews, dependent: :destroy
  monetize :rate_cents
  has_attachments :photos, maximum: 50
  paginates_per 9

  geocoded_by :address
  after_validation :geocode, if: :will_save_change_to_address?
  validates :address, presence: true
  validates :rate, presence: true

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
