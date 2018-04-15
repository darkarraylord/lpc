class BookingPolicy < ApplicationPolicy
  # Owners and Tenants can create bookings - DONE
  # Owner and Tenants can update its own bookings
  # Owner can update Tenants bookings of its own listings only status(approved/denied/canceled)
  # Tenant can add credit card to booking
  
  class Scope < Scope
    def resolve
      scope
    end
  end
  
  def create?
    return true
  end
  
  #Add pundit policy later to allow only
  # Booking creator to update
  # and booked listing owner
  #to update certain attributes

  def destroy?
    record.user == user
  end
end
