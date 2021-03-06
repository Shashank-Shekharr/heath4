import React, { useContext, useState, useEffect } from 'react';
import MainCalendar from './MainCalendar/MainCalendar';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import moment from 'moment';
import _ from 'lodash';
import omitDeep from 'omit-deep-lodash';

import { AuthContext } from '../../../globalState/index';
import { DoctorListContext } from '../../../globalState/index';
import { request } from '../../AxiosTest/config';
// import { viewSessions } from '../../AxiosTest/sessionRoutes';
import { updateProfile } from '../../AxiosTest/userRoutes';
import {
  round,
  workingDays,
  sanitizeDoctorSessions,
  convertAPIdataToJS,
} from './helpers';
import CalendarForm from './CalendarForm/CalendarForm';
import './Appointments.scss';

const Appointments = () => {
  // Setting States
  const { user, setUser } = useContext(AuthContext);
  const { doctorList } = useContext(DoctorListContext);
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState({});
  const [clientFormState, setClientFormState] = useState({
    doctor: '',
    startTime: round(moment(), moment.duration(15, 'minutes'), 'ceil').toDate(),
    endTime: '',
    sessionDuration: '',
    errors: [],
  });
  const [doctorAvailability, setDoctorAvailability] = useState({
    openingTime: moment().set({ hour: 5, minutes: 0 }).toDate(),
    closingTime: moment().set({ hour: 23, minutes: 0 }).toDate(),
    lunchBreakStart: moment().set({ hour: 11, minutes: 0 }).toDate(),
    lunchBreakEnd: moment().set({ hour: 16, minutes: 0 }).toDate(),
    unavailableDateTimes: [
      {
        startDateTime: round(
          moment(),
          moment.duration(15, 'minutes'),
          'ceil'
        ).toDate(),
        endDateTime: round(
          moment(),
          moment.duration(15, 'minutes'),
          'ceil'
        ).toDate(),
        modifier: RRule.WEEKLY,
      },
    ],
    errors: [],
  });

  useEffect(() => {
    if (!_.isEmpty(selectedDoctor)) {
      const selectedDoctorUnavailabilites =
        selectedDoctor.doctorInfo.workSchedule;

      console.log(selectedDoctorUnavailabilites);

      const sanitizedDataObj = convertWorkScheduleToCalendarEvents(
        selectedDoctorUnavailabilites
      );

      // Form has already been filled
      setUnavailabilities(sanitizedDataObj); // Displaying data to calendar
    }
  }, [selectedDoctor]);

  // Unavailability processing
  // Fetch workschedule from doctor

  const normalScheduleAggregrates = availability => {
    // doctorAvailability = availability

    const unavailableSession = (startDateTime, endDateTime, byweekday) => {
      return {
        startDateTime: startDateTime.toDate(),
        endDatetime: endDateTime.toDate(),
        byweekday: byweekday,
        modifier: RRule.WEEKLY,
      };
    };

    const unavailableMorning = unavailableSession(
      moment.utc(availability.openingTime).startOf('day'),
      moment.utc(availability.openingTime),
      workingDays
    );

    const unavailableLunch = unavailableSession(
      moment.utc(availability.lunchBreakStart),
      moment.utc(availability.lunchBreakEnd),
      workingDays
    );

    const unavailableAfternoon = unavailableSession(
      moment.utc(availability.closingTime),
      moment.utc(availability.closingTime).endOf('day'),
      workingDays
    );

    const unavailableWeekends = unavailableSession(
      moment().day(6).startOf('day'),
      moment().day(7).endOf('day'),
      [RRule.SA]
    );

    const standardUnavailabilities = [
      unavailableMorning,
      unavailableLunch,
      unavailableAfternoon,
      unavailableWeekends,
    ];

    //Available Times
    return standardUnavailabilities;
  };

  const convertWorkScheduleToCalendarEvents = availability => {
    // doctorAvailability = availability
    const unavailsAggregate = _.flattenDeep(
      normalScheduleAggregrates(availability),
      availability.unavailableDateTimes
    );

    const sanitizedUnavailabilities = sanitizeDoctorSessions(unavailsAggregate);

    const sanitizedDataObjReturn = convertAPIdataToJS(
      sanitizedUnavailabilities
    );
    return sanitizedDataObjReturn;
  };

  // When doctorAvailability updates / mounts
  useEffect(() => {
    // if (user.isDoctor) {
    //   // const workSchedule = user.doctorInfo.workSchedule;
    //   // Sanitize workSchedule (remove _id) => _.omitDeep
    //   // setDoctorAvailability(workSchedule);
    // }

    // First time the doctor creates the unavails or when the doctor updates
    if (
      doctorAvailability.openingTime &&
      doctorAvailability.closingTime &&
      doctorAvailability.lunchBreakStart &&
      doctorAvailability.lunchBreakEnd &&
      doctorAvailability.unavailableDateTimes[0] &&
      doctorAvailability.unavailableDateTimes[0].startDateTime &&
      doctorAvailability.unavailableDateTimes[0].endDateTime
    ) {
      // console.log('Use Effect 1');
      // Use piping here is also good

      const sanitizedDataObj = convertWorkScheduleToCalendarEvents(
        doctorAvailability
      );

      // Form has already been filled
      setUnavailabilities(sanitizedDataObj); // Displaying data to calendar
    }
  }, [doctorAvailability]);

  // If user already has unavaiblitiy data then prefill them
  // Component Mounts
  useEffect(() => {
    // console.log(user);

    // Set the doctor unavails from fetching
    if (
      user.isDoctor &&
      user.doctorInfo.workSchedule
      // && user.doctorInfo.workSchedule.unavailableDateTimes > 0
    ) {
      // console.log('Use Effect 2');
      // Problem number 2 why schedule.unavailabilities ?

      // Getting the unavailabilities of the doctor
      const unavailsRules = user.doctorInfo.workSchedule; // Form Data

      // Conversion (no longer need openingTime losingTime for displaying for RRule, if anything happens ask Harry)
      // Get lunch break
      const lunchBreak = {
        startDateTime: unavailsRules.lunchBreakStart,
        endDateTime: unavailsRules.lunchBreakEnd,
        modifier: RRule.WEEKLY,
        byweekday: workingDays,
      };

      // Spread lunch break with unavails
      const convertedArray = [
        ...unavailsRules.unavailableDateTimes,
        lunchBreak,
      ];

      // console.log(convertedArray);

      // Convert unavailsRules using sanitizeDoctorSessions
      const unavailsRealDatesData = sanitizeDoctorSessions(convertedArray); // Calendar Display Data

      // Set the unavailibities to the unavailsRealDatesData
      setUnavailabilities(unavailsRealDatesData); // Displaying the calendar with data

      // Prefilling the form
      setDoctorAvailability(unavailsRules);
    }
  }, []);

  // Actions

  const handleDoctorAvailabilitySubmit = async () => {
    //validations - no empty or dodgy fields

    checkEmptyDateFields('unavailableDateTimes');
    checkValidSubDateFields('unavailableDateTimes');

    if (
      !moment(doctorAvailability.openingTime).isValid() ||
      !moment(doctorAvailability.closingTime).isValid() ||
      !moment(doctorAvailability.lunchBreakStart).isValid() ||
      !moment(doctorAvailability.lunchBreakEnd).isValid()
    ) {
      setDoctorAvailability({
        ...doctorAvailability,
        errors: [
          'Please fill in all fields and only include valid dates and times',
        ],
      });
    }

    // console.log('here');

    // check that end date & times must be greater than start date & times
    if (
      moment(doctorAvailability.closingTime).isSameOrBefore(
        doctorAvailability.openingTime
      )
    ) {
      setDoctorAvailability({
        ...doctorAvailability,
        errors: ['Please select a valid closing time'],
      });
    }

    if (
      moment(doctorAvailability.openingTime).isSameOrAfter(
        doctorAvailability.closingTime
      )
    ) {
      setDoctorAvailability({
        ...doctorAvailability,
        errors: ['Please select a valid opening time'],
      });
    }

    if (
      moment(doctorAvailability.lunchBreakStart).isSameOrAfter(
        doctorAvailability.lunchBreakEnd
      )
    ) {
      setDoctorAvailability({
        ...doctorAvailability,
        errors: ['Please select a valid lunch break start time'],
      });
    }

    if (
      moment(doctorAvailability.lunchBreakEnd).isSameOrBefore(
        doctorAvailability.lunchBreakStart
      )
    ) {
      setDoctorAvailability({
        ...doctorAvailability,
        errors: ['Please select a valid lunch break end time'],
      });
    }

    const unavailabilityObj = {
      doctorInfo: {
        workSchedule: doctorAvailability, // Need to pass params in
      },
    };

    delete unavailabilityObj.doctorInfo.workSchedule.errors;

    // console.log(unavailabilityObj);

    try {
      const response = await updateProfile(unavailabilityObj);
      console.log(response);
      const sanitizedData = omitDeep(response.data, [
        '_id',
        '__v',
        'createdAt',
      ]);
      setUser(sanitizedData);
    } catch (err) {
      console.log(err);
      setUser({
        ...user,
        errors: [`Something went wrong, ${err}`],
      });
    }
  };

  const handleSelect = (e, key) => {
    setClientFormState({
      ...clientFormState,
      [key]: e.target.selectedOptions[0].id,
    });

    const id = e.target.selectedOptions[0].id;

    const doctor = doctorList.find(el => el._id === id);

    setSelectedDoctor(doctor);
  };

  const handleSubmit = async () => {
    // //validations
    // pending

    // unavailabilities.forEach(unavailability => {
    //   if (
    //     moment(clientFormState.startTime).isBetween(
    //       moment(unavailability.start),
    //       moment(unavailability.end)
    //     )
    //   ) {
    //     setClientFormState({
    //       ...clientFormState,
    //       errors: ['Sorry, the booking you select is unavailable'],
    //     });

    //     return null;
    //   }
    // });

    try {
      const sessionToBook = {
        startTime: moment(clientFormState.startTime).format('YYYY-MM-DD hh:mm'),
        endTime: moment(clientFormState.endTime).format('YYYY-MM-DD hh:mm'),
      };

      console.log(sessionToBook);

      const response = await request.post(
        `users/${clientFormState.doctor}/book`,
        sessionToBook
      );
      console.log(response);
    } catch (error) {
      setClientFormState({
        ...clientFormState,
        errors: [`something went wrong ${error}`],
      });
    }
  };

  const handleAddClick = (key, formFieldsObject) => {
    setDoctorAvailability({
      ...doctorAvailability,
      [key]: [...doctorAvailability[key], formFieldsObject],
    });
  };

  const handleRemoveClick = (key, i) => {
    //spread value at the formState key into list
    const list = [...doctorAvailability[key]];

    //at index i, remove one item
    list.splice(i, 1);
    setDoctorAvailability({
      ...doctorAvailability,
      [key]: list,
    });
  };

  const handleSessionDuration = (e, duration) => {
    if (e.target.value === duration) {
      const endTime = moment(clientFormState.startTime)
        .add(duration, 'minutes')
        .toDate();

      setClientFormState({
        ...clientFormState,
        sessionDuration: duration,
        endTime,
      });
    }
  };

  const handleUnavailableDateChange = (el, i, key, date, timeBlock) => {
    setDoctorAvailability({
      ...doctorAvailability,
      errors: [],
      [key]: doctorAvailability[key].map((element, index) => {
        if (index === i) {
          element[timeBlock] = date;
        }
        return element;
      }),
    });
  };

  const handleUnavailabilityModifiers = (e, i, key) => {
    setDoctorAvailability({
      ...doctorAvailability,
      errors: [],
      [key]: doctorAvailability[key].map((element, index) => {
        if (index === i) {
          element['modifier'] = e.target.value;
        }
        return element;
      }),
    });
  };

  const checkEmptyDateFields = key => {
    doctorAvailability[key].forEach(el => {
      const inputValues = Object.values(el);
      for (let i = 0; i < inputValues.length; i++) {
        if (
          typeof inputValues[i] !== 'string' &&
          !moment(inputValues[i]).isValid()
        ) {
          setDoctorAvailability({
            ...doctorAvailability,
            errors: [
              'Please fill in all fields and only include valid dates and times',
            ],
          });
        }
      }
    });
  };

  const checkValidSubDateFields = key => {
    doctorAvailability[key].forEach(el => {
      const clone = (({ modifier, ...o }) => o)(el);

      // clone.startDateTime
      // clone.endDateTime
      if (moment(clone.endDateTime).isSameOrBefore(clone.startDateTime)) {
        setDoctorAvailability({
          ...doctorAvailability,
          errors: [
            'Please select a valid end date time for your unavailability',
          ],
        });
      }

      if (moment(clone.startDateTime).isSameOrAfter(clone.endDateTime)) {
        setDoctorAvailability({
          ...doctorAvailability,
          errors: [
            'Please select a valid start date time for your unavailability',
          ],
        });
      }
    });
  };

  const renderDoctorAppointments = () => {
    return (
      <div className="appointments-wrapper">
        <section className="calendar-form-wrapper">
          <CalendarForm
            doctorAvailability={doctorAvailability}
            setDoctorAvailability={setDoctorAvailability}
            user={user}
            handleAddClick={handleAddClick}
            handleRemoveClick={handleRemoveClick}
            handleUnavailableDateChange={handleUnavailableDateChange}
            handleUnavailabilityModifiers={handleUnavailabilityModifiers}
            round={round}
            handleDoctorAvailabilitySubmit={handleDoctorAvailabilitySubmit}
            doctorList={doctorList}
          />
        </section>
        <MainCalendar
          user={user}
          doctorAvailability={doctorAvailability}
          unavailabilities={unavailabilities}
          doctorList={doctorList}
        />
      </div>
    );
  };

  const renderClientAppointments = () => {
    return (
      <div className="appointments-wrapper">
        <section className="calendar-form-wrapper">
          <CalendarForm
            clientFormState={clientFormState}
            setClientFormState={setClientFormState}
            handleSelect={handleSelect}
            handleSessionDuration={handleSessionDuration}
            user={user}
            doctorList={doctorList}
            selectedDoctor={selectedDoctor}
            handleSubmit={handleSubmit}
          />
        </section>
        <MainCalendar
          user={user}
          clientFormState={clientFormState}
          unavailabilities={unavailabilities}
          doctorList={doctorList}
          selectedDoctor={selectedDoctor}
        />
      </div>
    );
  };

  const showAppointmentView = () => {
    return user.isDoctor
      ? renderDoctorAppointments()
      : renderClientAppointments();
  };

  return showAppointmentView();
};

export default Appointments;
