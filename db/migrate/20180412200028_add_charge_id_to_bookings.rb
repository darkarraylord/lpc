class AddChargeIdToBookings < ActiveRecord::Migration[5.1]
  def change
    add_column :bookings, :chargeid, :string
  end
end
