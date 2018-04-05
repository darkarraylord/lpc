class CreateBookings < ActiveRecord::Migration[5.1]
  def change
    create_table :bookings do |t|
      t.belongs_to :user, foreign_key: true
      t.belongs_to :listing, foreign_key: true
      t.date :checkin
      t.date :checkout
      t.string :status
      t.float :total

      t.timestamps
    end
  end
end
