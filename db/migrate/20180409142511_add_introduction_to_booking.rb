class AddIntroductionToBooking < ActiveRecord::Migration[5.1]
  def change
    add_column :bookings, :introduction, :text
  end
end
