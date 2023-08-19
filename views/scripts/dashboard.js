
createTable = (elem, schedules) => {
  if (!elem) return;
  const uniqueDays = {};
  schedules.map(schedule => new Date(schedule.Start_Date).toLocaleDateString()).forEach(date => {uniqueDays[date] = ++uniqueDays[date] || 1})
  const rows = [];

  const uniqueDaysArray = Object.entries(uniqueDays);
  const tableHTML = uniqueDaysArray.sort((a,b) => new Date(a[0]) - new Date(b[0])).map((day, i) => {
      const currDaysHours = [... new Set(schedules.filter(schedule => new Date(schedule.Start_Date).toLocaleDateString() == day[0]).map(schedule => new Date(schedule.Start_Date).getHours()))]

      const currDayRoster = schedules.filter(schedule => new Date(schedule.Start_Date).toLocaleDateString() == day[0]).sort((a,b) => new Date(a.Start_Date) - new Date(b.Start_Date))

      const currRosterHTML = currDayRoster.map(schedule => {
          const {First_Name, Last_Name, Email, Phone, Start_Date, End_Date} = schedule;
          const date = new Date(Start_Date).toLocaleDateString();
          const startDate = new Date(Start_Date).toLocaleTimeString('en-us', {"minute": "2-digit", "hour": "2-digit"});
          const endDate = new Date(End_Date).toLocaleTimeString('en-us', {"minute": "2-digit", "hour": "2-digit"});
          rows.push([`${First_Name} ${Last_Name || ''}`, date, `${startDate} - ${endDate}`, Email, `${Phone}`])
          return `
              <div class="row">
                  <p class="name">${First_Name} ${Last_Name || ''}</p>
                  <p class="datetime">${startDate} - ${endDate}</p>
                  <p class="email">${Email}</p>
                  <p class="phone">${Phone}</p>
              </div>
          `
      }).join('')
      return `
          <div id="table-${i}" class="row day ${currDaysHours.length == 24 ? 'highlight' : ''}">
              <p class="date" style="text-align: left;">${new Date(day[0]).toLocaleDateString('en-us', {"weekday": "short"})} ${new Date(day[0]).toLocaleDateString()}</p>
              <p id="signups">${day[1]}</p>
              <p class="hours">${currDaysHours.length} / 24</p>
          </div>
          <div id="dropdown-table-${i}" class="dropdown-table">
            <div class="dropdown-scroll-container">
              <div class="row" id="header">
                  <p class="name">Name</p>
                  <p class="datetime">Time</p>
                  <p class="email">Email</p>
                  <p class="phone">Phone</p>
              </div>
              ${currRosterHTML}
            </div>
          </div>
      `
  }).join('');

  elem.innerHTML = `
    <div id="table-container">
      <div id="table-header">
          <p class="date">Date</p>
          <p>Signups</p>
          <p class="hours">Hours Covered</p>
      </div>
      <div id="roster-table">
          ${tableHTML}
      </div>
      <div id="table-footer">
        <p>YTD All Sign-Ups (${new Date().getFullYear()})</p>
        <button id="csv-download" class="btn">Download CSV</button>
      </div>
    </div>
  `

  for (let i = 0; i < uniqueDaysArray.length; i ++) {
      document.getElementById(`table-${i}`).onclick = () => toggleDropdown(i)
  }

  document.getElementById('csv-download').onclick = () => getCSV(rows);

  // const tableContainer = document.getElementById('table-container');
  //     tableContainer.style.display = 'grid';
  //     tableContainer.style.visibility = 'visible';
}

const getCSV = (rows) => {
  let csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.join(",")).join("\n");

  var encodedUri = encodeURI(csvContent);
  window.open(encodedUri, "_blank");
}

const toggleDropdown = (i) => {
  document.getElementById(`dropdown-table-${i}`).classList.toggle('open')
}

const createSignupChart = (elem, schedules) => {
  if (!elem) return;
  const allMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const monthlySignUps = allMonths.map(month => schedules.filter(schedule => new Date(schedule.Start_Date).getMonth() === allMonths.indexOf(month)).length);
  
  const chartCanvasDOM = document.createElement('canvas');
  elem.appendChild(chartCanvasDOM);
  new Chart(
    chartCanvasDOM,
    {
      type: 'bar',
      data: {
        labels: allMonths,
        datasets: [{
          label: 'Monthly Prayers',
          data: monthlySignUps,
          backgroundColor: [
            '#fcbb09'
          ],
          borderColor: [
            '#cb9605'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    }
  )
}

const createLeaderBoard = (elem, users) => {
  if (!elem) return;
  const userCounts = users.map(user => user.Count);
  const userDisplayNames = users.map(user => user.Display_Name);

  const chartCanvasDOM = document.createElement('canvas');
  elem.appendChild(chartCanvasDOM);
  new Chart(
    chartCanvasDOM,
    {
      type: 'bar',
      data: {
        labels: userDisplayNames,
        datasets: [{
          label: 'Hours of Prayer',
          data: userCounts,
          backgroundColor: [
            '#fcbb09'
          ],
          borderColor: [
            '#cb9605'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    }
  )
}

let previousPrayerPointsValue;
let currentCommunityID;
const toggleEditPrayerPoints = () => {
  const prayerPointsInputDOM = document.getElementById('prayer-points');
  const submitBtnDOM = document.getElementById('submit-btn');
  const toggleEditBtnDOM = document.getElementById('toggle-edit-btn');

  const isDisabled = prayerPointsInputDOM.disabled = !prayerPointsInputDOM.disabled;
  submitBtnDOM.disabled = isDisabled;
  
  if (isDisabled) {
    toggleEditBtnDOM.textContent = 'Edit';
    prayerPointsInputDOM.value = previousPrayerPointsValue;
  } else {
    toggleEditBtnDOM.textContent = 'Cancel';
  }
  previousPrayerPointsValue = prayerPointsInputDOM.value || '';
}

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

const submitPrayerPoints = async (e) => {
  e.preventDefault();
  const prayerPointsInputDOM = document.getElementById('prayer-points');

  if (previousPrayerPointsValue == prayerPointsInputDOM.value) return toggleEditPrayerPoints();

  previousPrayerPointsValue = prayerPointsInputDOM.value || '';

  toggleEditPrayerPoints();
  
  await axios({
    method: 'put',
    url: `/api/v2/mp/PrayerPoints/${currentCommunityID}`,
    data: {
      Reminder_Text: prayerPointsInputDOM.value
    }
  })
  .catch(err => console.log(err))
}

let prayerDays = new Map();
const updateReservationList = async () => {
  prayerDays.clear();
  const communityReservations = await axios({
      method: 'get',
      url: `/api/v2/mp/CommunityReservations/${currentCommunityID}`
  })
    .then(response => response.data)
    .catch(err => console.log(err));

  const reservationsHTML = communityReservations.map(res => {
      const {Reservation_Date, WPAD_Community_Reservation_ID} = res;
      const currDate = new Date(Reservation_Date);
      prayerDays.set(WPAD_Community_Reservation_ID, Reservation_Date);
      return `
      <div class="data-row" id="row-${WPAD_Community_Reservation_ID}">
          <div class="date-label" id="date-${WPAD_Community_Reservation_ID}">${currDate.toLocaleDateString('en-us', {weekday: "short"})} ${currDate.toLocaleDateString()}</div>
          <button title="edit date" id="edit-btn-${WPAD_Community_Reservation_ID}" class="reservation-edit-btn btn" onclick="edit(${WPAD_Community_Reservation_ID})"><i class='fas fa-edit'></i></button>
          <button title="delete date" id="delete-btn-${WPAD_Community_Reservation_ID}" class="reservation-delete-btn btn" onclick="remove(${WPAD_Community_Reservation_ID})"><i class='fas fa-trash'></i></button>
          <button title="save date" id="save-btn-${WPAD_Community_Reservation_ID}" class="reservation-save-btn btn" onclick="save(${WPAD_Community_Reservation_ID})"><i class='fas fa-save'></i></button>
          <button title="cancel" id="cancel-btn-${WPAD_Community_Reservation_ID}" class="reservation-cancel-btn btn" onclick="cancel(${WPAD_Community_Reservation_ID})"><i class='fas fa-times-circle'></i></button>
      </div>`
  }).join('')
  document.getElementById('reservation-table').innerHTML = `
    <div class="data-row header">
        <p>My Prayer Days:</p>
    </div>
    ${reservationsHTML}
  `;
}

const newReservationDate = async () => {
  const newDateInput = document.getElementById('new-prayer-date');
  const newDate = new Date(newDateInput.value);
  newDateInput.value = null;
  
  await axios({
    method: 'post',
    url: `/api/v2/mp/CommunityReservations/${currentCommunityID}`,
    data: {
      Reservation_Date: newDate.toISOString()
    }
  })
  .catch(err => console.log(err));

  updateReservationList()
}

const showButtons = (id) => {
    const editBtnElem = document.getElementById(`edit-btn-${id}`);
    const saveBtnElem = document.getElementById(`save-btn-${id}`);
    const cancelBtnElem = document.getElementById(`cancel-btn-${id}`);
    const deleteBtnElem = document.getElementById(`delete-btn-${id}`);

    // STYLING
    editBtnElem.style.display = 'none'
    editBtnElem.style.visibility = 'hidden'

    saveBtnElem.style.display = 'block'
    saveBtnElem.style.visibility = 'visible'
    cancelBtnElem.style.display = 'block'
    cancelBtnElem.style.visibility = 'visible'
    deleteBtnElem.style.display = 'block'
    deleteBtnElem.style.visibility = 'visible'
}

const hideButtons = (id) => {
    const editBtnElem = document.getElementById(`edit-btn-${id}`);
    const saveBtnElem = document.getElementById(`save-btn-${id}`);
    const cancelBtnElem = document.getElementById(`cancel-btn-${id}`);
    const deleteBtnElem = document.getElementById(`delete-btn-${id}`);


    // STYLING
    editBtnElem.style.display = 'block'
    editBtnElem.style.visibility = 'visible'

    saveBtnElem.style.display = 'none'
    saveBtnElem.style.visibility = 'hidden'
    cancelBtnElem.style.display = 'none'
    cancelBtnElem.style.visibility = 'hidden'
    deleteBtnElem.style.display = 'none'
    deleteBtnElem.style.visibility = 'hidden'
}


const edit = (id) => {
    prayerDays.forEach((date, id) => cancel(id))

    const dateLabel = document.getElementById(`date-${id}`);
    const currDate = new Date(dateLabel.innerText);
    dateLabel.innerHTML = `<input type="date" id="date-input-${id}"></input>`
    const dateInput = document.getElementById(`date-input-${id}`);
    dateInput.valueAsDate = currDate;
    
    showButtons(id);
}

const cancel = (id) => {
  const currDate = new Date(prayerDays.get(id))
  const dateLabel = document.getElementById(`date-${id}`);
  dateLabel.innerHTML = `${currDate.toLocaleDateString('en-us', {weekday: "short"})} ${currDate.toLocaleDateString()}`
  
  hideButtons(id)
}

const save = async (id) => {
  const dateInput = document.getElementById(`date-input-${id}`);
  const newDate = new Date(dateInput.value);
  newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset())

  prayerDays.set(id, formatDate(newDate));
  cancel(id);

  // const dateLabel = document.getElementById(`date-${id}`);
  // dateLabel.innerHTML = `${newDate.toLocaleDateString('en-us', {weekday: "short"})} ${newDate.toLocaleDateString()}`

  await axios({
    method: 'put',
    url: `/api/v2/mp/CommunityReservations/${currentCommunityID}`,
    data: {
      WPAD_Community_Reservation_ID: id,
      Reservation_Date: newDate.toISOString()
    }
  })
  // updateReservationList();
    
    // hideButtons(id)
  // const offset = newDate.getTimezoneOffset();
  // const currDate = new Date(newDate.setMinutes(newDate.getMinutes() + offset));
}

const remove = (id) => {
    const currDate = new Date(prayerDays.get(id))
    showPopup('Confirm Delete', `Are you sure you want to delete ${currDate.toLocaleDateString('en-us', {weekday: "short"})} ${currDate.toLocaleDateString()}`, 'Cancel', null, 'Confirm', () => removeDate(id))
}

const removeDate = async (id) => {
    prayerDays.delete(id)
    const currRow = document.getElementById(`row-${id}`);
    currRow.remove();

    await axios({
        method: 'delete',
        url: `/api/v2/mp/CommunityReservations/${currentCommunityID}`,
        data: {
          WPAD_Community_Reservation_ID: id
        }
    })
}

(async () => {
  loading();
  const myCommunity = await axios({
    method: 'get',
    url: '/api/v2/mp/myCommunity'
  })
    .then(response => response.data);
  const prayerSchedules = axios({
      method: 'get',
      url: `/api/v2/mp/CommunityPrayerSchedules/${myCommunity.WPAD_Community_ID}`
  })
    .then(response => {
      const { data: prayerSchedules } = response;
      const ytdPrayerSchedules = prayerSchedules.filter(schedule => new Date(schedule.Start_Date).getFullYear() === new Date().getFullYear())
      const signUpsTable = document.getElementById('ytd-signups-table');
      const signUpChart = document.getElementById('monthy-signups');
      createTable(signUpsTable, ytdPrayerSchedules);
      createSignupChart(signUpChart, ytdPrayerSchedules);
      return prayerSchedules;
    })
  const top10Users = await axios({
      method: 'get',
      url: `/api/v2/mp/Top10Users/${myCommunity.WPAD_Community_ID}`
  })
    .then(response => {
      const { data: top10Users } = response;
      const leaderBoardChart = document.getElementById('user-leaderboard');
      createLeaderBoard(leaderBoardChart, top10Users);
      return top10Users;
    });

  currentCommunityID = myCommunity.WPAD_Community_ID;

  // console.log(prayerSchedules)
  // this.update();
  updateReservationList();


  // prayer points form
  const prayerPointsInputDOM = document.getElementById('prayer-points');
  prayerPointsInputDOM.value = myCommunity.Reminder_Text || '';

  doneLoading();
})()


