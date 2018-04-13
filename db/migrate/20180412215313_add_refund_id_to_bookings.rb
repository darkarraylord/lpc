class AddRefundIdToBookings < ActiveRecord::Migration[5.1]
  def change
    add_column :bookings, :refund_id, :string
  end
end
