class Booking < ApplicationRecord
  belongs_to :user
  belongs_to :listing
  
  validates :status, inclusion: { in: ["pending", "denied", "approved"], allow_nil: false }
  validates :checkin, presence: { message: "must be given please" }
  validates :checkout, presence: { message: "must be given please" }
  validates :introduction, length: {
    minimum: 30,
    maximum: 400,
    tokenizer: lambda { |str| str.scan(/\w+/) },
    too_short: "must have at least %{count} words",
    too_long: "must have at most %{count} words"
  }
  #validates :valid_date_range_required
  validates :checkin, presence: true, if: :valid_date_range_required?
  validates :checkout, presence: true, if: :valid_date_range_required?

  def valid_date_range_required?
    if checkin.past? || checkout.past?
      errors.add(:checkin, "You cannot book in the past.")
    elsif checkin > checkout
      errors.add(:checkout, "Checkout must happen after checkin.")
    elsif (checkout - checkin).to_i < 7
      errors.add(:checkin, "You cannot book less then a week.")
      errors.add(:checkout, "You cannot book less then a week.")
    end
  end
  
  def unique_dates?(listing_id)
    Listing.find(listing_id).bookings.each do |booking|
      if checkin.between?(booking.checkin, booking.checkout)
        false
      elsif checkout.between?(booking.checkin, booking.checkout)
        false
      else
        true
      end 
    end 
  end
  
  def date_between?(listing_id)
    Listing.find(listing_id).bookings.each do |booking|
      if checkin.between?(booking.checkin, booking.checkout)
        return true
      elsif checkout.between?(booking.checkin, booking.checkout)
        return true
      end 
    end
    return false
  end
  
  def date_overlaps?(listing_id)
    Listing.find(listing_id).bookings.each do |booking|
      (checkin..checkout).overlaps?(booking.checkin..booking.checkout)
    end 
    return false
  end
  
end
