const urlParams = new URLSearchParams(window.location.search);
const date = urlParams.get('date');
const hour = urlParams.get('hour');

if (!date) window.location = '/';

const signUpFormDOM = document.getElementById('sign-up-form');
const prayerDateDOM = document.getElementById('prayer-date');
const communityChampionsListDOM = document.getElementById('community-champions');
const currTimeDOM = document.getElementById('curr-time');
// form inputs
const firstNameInputDOM = document.getElementById('First_Name');
const lastNameInputDOM = document.getElementById('Last_Name');
const emailInputDOM = document.getElementById('Email');
const phoneInputDOM = document.getElementById('Phone');
const communitySelectDOM = document.getElementById('Community_ID');
const hourInputsDOMList = document.getElementsByName('hour');

const recurringCheckboxDOM = document.getElementById('Recurring');
const dayPositionInputDOM = document.getElementById('sequenceDayPosition');
const weekdaysInputDOM = document.getElementById('sequenceWeekdays');
const intervalInputDOM = document.getElementById('sequenceInterval');
const occurrencesInputDOM = document.getElementById('sequenceTotalOccurrences');
const updateIconContainerDOM = document.getElementById('update-icon-container');
const updateDateContainerDOM = document.getElementById('update-date-container');

let signUpPattern = [];

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JavaScript
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

const updateTime = (hour) => {
  const Start_Date = new Date(new Date(date).setHours(hour));
  const End_Date = new Date(new Date(Start_Date).getTime() + 3600000)
  
  currTimeDOM.innerText = `Hour of Prayer: ${Start_Date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${End_Date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
}

const updateSignUpPattern = async () => {
  const selectedHour = [...hourInputsDOMList].filter(elem => elem.checked)[0];
  const localStartDate = selectedHour && selectedHour.value ? new Date(new Date(date).setHours(selectedHour.value)) : new Date(date);
  // check for recurring signup and get sequence if needed
  if (recurringCheckboxDOM.checked) {
    signUpPattern = await axios({
      method: 'get',
      url: '/api/v2/mp/GenerateSequence',
      params: {
        Interval: parseInt(intervalInputDOM.value),
        StartDate: formatDate(localStartDate),
        DayPosition: dayPositionInputDOM.value,
        TotalOccurrences: parseInt(occurrencesInputDOM.value),
        Weekdays: weekdaysInputDOM.value
      }
    })
    .then(response => response.data)
    
    // add it to sequence if it's not included
    if (!signUpPattern.includes(formatDate(localStartDate))) signUpPattern.unshift(formatDate(localStartDate))
  } else {
    signUpPattern.push(formatDate(localStartDate));
  }
  
  updateDateContainerDOM.innerHTML = signUpPattern.map(date => {
    return `<p>${date.split('T')[0]}</p>`
  }).join('')
  updateIconContainerDOM.classList.add('highlight');
}
recurringCheckboxDOM.addEventListener('change', updateSignUpPattern);
dayPositionInputDOM.addEventListener('change', updateSignUpPattern);
weekdaysInputDOM.addEventListener('change', updateSignUpPattern);
intervalInputDOM.addEventListener('change', updateSignUpPattern);
occurrencesInputDOM.addEventListener('change', updateSignUpPattern);

(async () => {
  const communityReservations = await axios({
    method: 'get',
    url: '/api/v2/mp/getReservations',
    params: {
      startDate: formatDate(date),
      endDate: formatDate(new Date(new Date(date).getTime() + (1000*60*60*24-1))) //24 hours ahead of startDate
    }
  })
    .then(response => response.data);

  const day = new Date(date).getDate();
  const month = new Date(date).getMonth() + 1;
  const year = new Date(date).getFullYear();
  const prayerSchedules = await axios({
    method: 'get',
    url: '/api/v2/mp/PrayerSchedules',
    params: {
      $filter: `DAY(Start_Date)=${day} AND MONTH(Start_Date)=${month} AND YEAR(Start_Date)=${year}`
    }
  })
    .then(response => response.data);

  const communities = await axios({
    method: 'get',
    url: '/api/v2/mp/PrayerCommunities'
  })
    .then(response => response.data)

  prayerDateDOM.innerHTML = new Date(date).toLocaleDateString('en-us', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  const distinctCommunityChampionNames = [...new Set(communityReservations.map(reservation => reservation.Community_Name))];
  communityChampionsListDOM.innerHTML = 'Championed By: <strong>' + distinctCommunityChampionNames.join(', ') + '</strong>'

  if (!distinctCommunityChampionNames.length) {
    communityChampionsListDOM.style.display = 'none';
    communityChampionsListDOM.style.visibility = 'hidden';
  }

  const hours = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
  document.querySelector('#hours-options').innerHTML = hours.map(hr => {
      const time = hr == 0 ? `12 AM` : hr == 12 ? `${hr} PM` : hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
      return `
          <div class="checkbox-container">
              <input type="radio" name="hour" value="${hr}" id="${hr}" ${hr == hour ? 'checked' : ''} onclick="updateTime(${hr})" required>
              <label for="${hr}">${time}</label>
          </div>
      `
  }).join('');

  for (const schedule of prayerSchedules) {    
    const currHour = new Date(new Date(schedule.Start_Date).getTime() - ((new Date(schedule.Start_Date).getTimezoneOffset() - 420) * 60000)).getHours()
    document.getElementById(`${currHour}`).classList.add('covered');
  }

  const communitiesHTML = communities.map(community => {
    const {WPAD_Community_ID, Community_Name} = community;
    return `
        <option value="${WPAD_Community_ID}">${Community_Name}</option>
    `
  })
  communitiesHTML.push(`<option value="-1">Other</option>`)
  communitiesHTML.unshift(`<option value="" selected disabled>Choose One...</option>`)
  
  document.getElementById('Community_ID').innerHTML = communitiesHTML.join('');
})()

signUpFormDOM.addEventListener('submit', async (e) => {
  e.preventDefault();
  loading();
  
  const selectedHour = [...hourInputsDOMList].filter(elem => elem.checked)[0];
  if (!selectedHour) return;
  
  const localStartDate = new Date(new Date(date).setHours(selectedHour.value));
  const localEndDate = new Date(new Date(date).setHours(parseInt(selectedHour.value) + 1));
  
  await updateSignUpPattern();

  try {
    const signUpDates = signUpPattern.map(date => {
      const startDateAsDate = new Date(date)
      const endDate = new Date(new Date().setTime(startDateAsDate.getTime() + (1000 * 60 * 60)))
      return {
        Start_Date: date,
        End_Date: formatDate(endDate)
      }
    })

    const prayerSchedules = signUpDates.map(dates => {
      const { Start_Date, End_Date } = dates;
      return {
        First_Name: firstNameInputDOM.value,
        Last_Name: lastNameInputDOM.value,
        Start_Date: Start_Date,
        End_Date: End_Date,
        Email: emailInputDOM.value,
        Phone: phoneInputDOM.value,
        WPAD_Community_ID: communitySelectDOM.value
      }
    })

    // add new prayer schedule to the database

    await axios({
      method: 'post',
      url: '/api/v2/mp/PrayerSchedules',
      data: prayerSchedules
    })

    // send email now
    await axios({
      method: 'post',
      url: '/api/v2/mp/ConfirmationEmail',
      data: {
        Email: emailInputDOM.value,
        First_Name: firstNameInputDOM.value,
        DateString: signUpPattern.map(date => new Date(date).toLocaleDateString('en-us', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })).join('</br>'),
        TimeString: `${localStartDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${localEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        Dates: signUpPattern.map(date => new Date(new Date(date).getTime() + (new Date(date).getTimezoneOffset() * 60000)).toISOString())
      }
    })
    .then(() => {
      showPopup(
        'Thank you for signing up!',
        `
          <p>You should recieve a confirmation email regarding your scheduled time of prayer.</p>
          <p style="text-align: center;">${localStartDate.toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"})}${signUpPattern.length > 1 ? ` + ${signUpPattern.length-1} More` : ''}</p>
          <p style="text-align: center;">${localStartDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${localEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        `,
        'Confirm',
        '/'
      )
    });



    doneLoading();
  } catch (error) {
    doneLoading();
    console.error(error)
    showPopup(
      'Error',
      `
      <p style="text-align: center; color: #c0392b;">Something went wrong, please try again later.</p>
      `,
      'Okay',
      `/signup?date=${date}`
      )
  }
})