class Booking < ApplicationRecord
  belongs_to :user
  belongs_to :listing
  
  validates :status, inclusion: { in: ["pending", "denied", "approved"], allow_nil: false }
  validates :introduction, length: {
    minimum: 30,
    maximum: 400,
    tokenizer: lambda { |str| str.scan(/\w+/) },
    too_short: "must have at least %{count} words",
    too_long: "must have at most %{count} words"
  }
  
  def approve!
    @booking.status = "approve"
  end
  
  private
  
  def approved?
    @booking.status == "approved"
  end
end
