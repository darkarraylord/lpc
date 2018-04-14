class ListingPolicy < ApplicationPolicy
  
  # Owner can create listings 
  # Owner can update its own listings
  # Owner can update its own listings
  # Owner can add amenities to its own listings (edit)
  # Tenant can list listings
  
  class Scope < Scope
    def resolve
      scope.all
      # For a multi-tenant SaaS app, you may want to use:
      # scope.where(user: user)
      
    end
  end
  
  def create?
    return true
  end
  def update?
    record.user == user
    # - record: the restaurant passed to the `authorize` method in controller
    # - user:   the `current_user` signed in with Devise.
  end

  def destroy?
    record.user == user
  end
end
