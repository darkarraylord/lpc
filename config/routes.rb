Rails.application.routes.draw do
<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
  devise_for :users
  root to: 'pages#home'
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
