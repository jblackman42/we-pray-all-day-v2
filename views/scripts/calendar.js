class PrayerCalendar extends HTMLElement {
  constructor() {
    super();

    this.monthDays = [];
    
    const today = new Date();
    this.month = today.getMonth();
    this.year = today.getFullYear();

    this.draw();
  }

  loading = () => {
    const loadingDOM = document.querySelector('#loading');
    loadingDOM.style.visibility = 'visible';
    loadingDOM.style.display = 'grid';
  }

  doneLoading = () => {
    const loadingDOM = document.querySelector('#loading');
    loadingDOM.style.visibility = 'hidden';
    loadingDOM.style.display = 'none';
  }

  nextMonth = () => {
      this.monthDays = [];
      if (this.month < 11) {
          this.month ++;
      } else {
          this.month = 0;
          this.year ++;
      }
      this.update(this.year, this.month)
  }
  prevMonth = () => {
      this.monthDays = [];
      if (this.month > 0) {
          this.month --;
      } else {
          this.month = 11;
          this.year --;
      }
      this.update(this.year, this.month)
  }

  formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JavaScript
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }


  draw = () => {


    this.innerHTML = `
      <div id="loading">
        <div class="loader"></div>
      </div>
      <div class="calendar">
        <div class="calendar-controls">
          <div class="month-selector-container">
            <button class="btn" id="prev-month"><i class="material-icons">keyboard_arrow_left</i></button>
            <h3 id="month-label">September 2023</h3>
            <button class="btn" id="next-month"><i class="material-icons">keyboard_arrow_right</i></button>
          </div>

          <select id="community-select"></select>

          <div id="legend">
            <div id="empty-square"></div>
            <p>: Open for Prayer</p>
            <div id="filled-square"></div>
            <p>: Booked for Prayer</p>
          </div>
        </div>

        <div id="weekdays">
        </div>

        <div id="days-grid">
        </div>
      </div>
    `
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    prevMonthBtn.onclick = this.prevMonth;
    nextMonthBtn.onclick = this.nextMonth;

    return this.update(this.year, this.month);
  }

  getNumLabel = (date) => {
      const dateArray = date.toString().split('')
      const lastDateDigit = dateArray[dateArray.length - 1];
      return [11,12,13].includes(date) ? 'th' : lastDateDigit == 1 ? 'st' : lastDateDigit == 2 ? 'nd' : lastDateDigit == 3 ? 'rd' : 'th'
  }

  update = async (year, month) => {
    this.loading();
    // Create Month Data ------------------------------------------------------------
    
    // const date = new Date(year, month, 1);
    console.log(year)
    console.log(month)
    // const date = new Date(year, month, 1)
    const date = new Date(new Date(year, month, 1).toLocaleDateString('en-us', {timeZone: 'US/Arizona'}))
    console.log(date)
    //loops and iterates day by one until month no longer is the same
    while (date.getMonth() === month) {
        //saves each day of the month parameter
        this.monthDays.push(date.toDateString());
        date.setDate(date.getDate() + 1);
    }

    const bufferDays = parseInt(new Date(this.monthDays[0]).getDay());
    for (let i = 0; i < bufferDays; i ++) {
        const earliestDate = new Date(this.monthDays[0]);
        this.monthDays.unshift(new Date(earliestDate.setDate(earliestDate.getDate() - 1)))
    }
    // ------------------------------------------------------------------------------
    
    // Create Header Row ------------------------------------------------------------
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthHeaderDOM = document.querySelector('#month-label');
    monthHeaderDOM.innerHTML = `${months[month]} ${year}`;

    // ------------------------------------------------------------------------------
        
    // Create Week Row ------------------------------------------------------------
    
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdaysDOM = document.querySelector('#weekdays');
    weekdaysDOM.innerHTML = weekdays.map(weekday => {
        const otherLetters = weekday.split('').slice(1).join('');
        const firstLetter = weekday.split('')[0];
        return `<p>${firstLetter}<span>${otherLetters}</span></p>`
    }).join('')
    
    // ----------------------------------------------------------------------------

    // Create Calendar Days ------------------------------------------------------------

    const daysGrid = document.querySelector('#days-grid');
    daysGrid.innerHTML = this.monthDays.map(day => {
      const currDate = new Date(day);
      const date = currDate.getDate();
      const hours = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
      return `
        <button class="calendar-day">
          <p class="date">${date}<sup>${this.getNumLabel(date)}</sup></p>

          <div class="day-row">
            <!--<p class="community">Covered By:<br><span class="community-name">Congregation Baruch Shem (Blessed be the Name)</span</p>-->
            <p class="community"></p>
          </div>
          <div class="day-row bottom">
            <p class="hours-label">24 hours remaining</p>
            <p class="percent-label">60%</p>
            <div class="hours-container">
              ${hours.map(hour => {
                  return `<a href="/signup?date=${day}&hour=${hour}}" id="${hour}-${date}-${month}-${year}" class="hour" data-content="${hour > 12 || hour == 0 ? Math.abs(hour - 12) : hour}:00 ${hour < 12 ? 'AM' : 'PM'}"></a>`
              }).join('')}
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" id="bar-${date}-${month}-${year}" style="max-width: 70%;"></bar>
            </div>
          </div>
        </button>
      `
    }).join('')

    // ---------------------------------------------------------------------------------
    
    // Populate Communities Selection --------------------------------------------------

    const allCommunities = await axios({
      method: 'get',
      url: '/api/v2/mp/getCommunities'
    })
      .then(response => response.data)
      .catch(err => {
        console.error(err);
      })

    const communitySelectDOM = document.getElementById('community-select');
    allCommunities.sort((a,b) => a.Community_Name < b.Community_Name ? -1 : b.Community_Name < a.Community_Name ? 1 : 0);
    allCommunities.unshift({
      WPAD_Community_ID: 0,
      Community_Name: "All Churches & Communities..."
    })
    communitySelectDOM.innerHTML = allCommunities.map(community => {
      const { WPAD_Community_ID, Community_Name } = community;
      return `
        <option value="${WPAD_Community_ID}">${Community_Name}</option>
      `
    }).join('')

    // ---------------------------------------------------------------------------------
    
    // Populate Hours With Prayer Schedules --------------------------------------------
    
    // console.log(new Date(this.monthDays[0]).toISOString())
    // const allPrayerSchedules = await axios({
    //   method: 'get',
    //   url: '/api/v2/mp/getSchedules'
    // })

    // ---------------------------------------------------------------------------------

    this.doneLoading();
  }
}

customElements.define('prayer-calendar', PrayerCalendar);