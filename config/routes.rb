Rails.application.routes.draw do

  get 'listing_amenities/show'

  get 'listing_amenities/index'

  get 'bookings/show'

  get 'bookings/edit'

  get 'bookings/index'

  get 'amenities/show'

  get 'amenities/index'

  get 'amenities/new'

  get 'amenities/edit'

  get 'listings/index'

  get 'listings/show'

  get 'listings/new'

  get 'listings/edit'

  devise_for :users
  root to: 'pages#home'
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
