class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable
  has_many :listings
  has_many :bookings
  
  enum role: [:earl, :owner, :tenant, :admin]
  
  after_initialize :set_default_role, :if => :new_record?

  def set_default_role
    self.role ||= :tenant
  end
end
