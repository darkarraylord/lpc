class Booking < ApplicationRecord
  belongs_to :user
  belongs_to :listing
  
  validates :status, inclusion: { in: ["pending", "denied", "approved"], allow_nil: false }
  
  def approve!
    @booking.status = "approve"
  end
  
  private
  
  def approved?
    @booking.status == "approved"
  end
end
