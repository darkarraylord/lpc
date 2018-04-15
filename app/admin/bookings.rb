ActiveAdmin.register Booking do
# See permitted parameters documentation:
# https://github.com/activeadmin/activeadmin/blob/master/docs/2-resource-customization.md#setting-up-strong-parameters
#
permit_params :status, :state, :payment
#
# or
#
# permit_params do
#   permitted = [:permitted, :attributes]
#   permitted << :other if params[:action] == 'create' && current_user.admin?
#   permitted
# end

form do |f|
    f.inputs "Reservation" do
      f.input :status
      f.input :state
      f.jsonb :payment
    end
    f.inputs "Revenue" do
      f.input :amount_cents
      f.input :amount_currency
    end
    f.inputs "Listing" do
      f.input :listing
    end
    f.actions
  end

  permit_params :name, :address, :rate_cents, :latitude, :longitude, :visible
end
