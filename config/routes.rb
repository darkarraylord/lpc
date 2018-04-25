Rails.application.routes.draw do
  
  ActiveAdmin.routes(self)
  mount Attachinary::Engine => "/attachinary"


  resources :amenities
  
  resources :listings do 
    resources :bookings do 
      resources :payments, only: [:new, :create]
    end
    resources :reviews, only: :create
    resources :amenities
  end
  
  resources :user do 
    resources :bookings, only: [:index]
  end
  

  devise_for :users
  root to: 'pages#home'
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
