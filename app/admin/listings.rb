ActiveAdmin.register Listing do
# See permitted parameters documentation:
# https://github.com/activeadmin/activeadmin/blob/master/docs/2-resource-customization.md#setting-up-strong-parameters
#
permit_params :name, :address, :latitude, :longitude, :rate_cents, :visible
#
# or
#
# permit_params do
#   permitted = [:permitted, :attributes]
#   permitted << :other if params[:action] == 'create' && current_user.admin?
#   permitted
# end
  form do |f|
    f.inputs "Property" do
      f.input :name
      f.input :address
      f.input :rate_cents
    end
    f.inputs "Coordinates" do
      f.input :latitude
      f.input :longitude
    end
    f.inputs "Visibility" do
      f.input :visible
    end
    f.actions
  end

  permit_params :name, :address, :rate_cents, :latitude, :longitude, :visible

end
