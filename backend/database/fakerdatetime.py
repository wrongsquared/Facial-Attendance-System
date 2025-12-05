#This file exists just for me to explore Faker's date time creation.

from faker import Faker
from datetime import timedelta # Allows us to add time suck as hours, minutes and days

fake = Faker()


# start_dt = fake.date_time_this_year()

# duration = timedelta(hours=3)

# end_time  = start_dt + duration
# print("Start Time:", start_dt)
# print("End Time:", end_time)
fakeName = fake.name()
nameSplit = fakeName.split()
userName = ""
for i in nameSplit:
    userName += i[0]
print(userName)