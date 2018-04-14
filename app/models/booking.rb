class Booking < ApplicationRecord
  belongs_to :user
  belongs_to :listing
  monetize :amount_cents
  enum status: [:pending, :denied, :approved, :canceled]
  
  validates :status, presence: true
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
  
  # Charge tenant once booking is approved.
  def charge
    Stripe::Charge.create(
      customer:     stripe_token,
      amount:       500000,
      description:  "Payment for booking #{id} at order #{listing.name} in #{checkin} to #{checkout}",
      currency:     amount.currency
    )
    rescue Stripe::CardError => e
      flash[:alert] = e.message
      redirect_to new_listing_booking_payment_path(listing_id: listing.id ,id: id)
  end
  
  def refund
    Stripe::Refund::create(
      charge: chargeid
    )
    rescue Stripe::CardError => e
      flash[:alert] = e.message
      redirect_to listing_booking_path(listing_id: listing.id ,id: id)
  end
end
