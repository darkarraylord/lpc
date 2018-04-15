class AddVisibilityToReviews < ActiveRecord::Migration[5.1]
  def change
    add_column :reviews, :visible, :boolean, null: false, default: true
  end
end
