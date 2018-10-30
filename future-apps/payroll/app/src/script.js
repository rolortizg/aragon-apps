import Aragon from '@aragon/client'

import * as idm from './services/idm'

const app = new Aragon()

app.store(async (state, { event }) => {
  if (state === null) {
    const initialState = {
      employees: await getAllEmployees()
    }

    state = initialState
  }

  if (event === 'AddEmployee') {
    const employees = await getAllEmployees()

    state = {
      ...state,
      employees
    }
  }

  return state
})

function getEmployeeById (id) {
  return app.call('getEmployee', id)
    .first()
    .map(data => marshallEmployeeData({ id, ...data }))
    .flatMap(async employee => {
      const [{ name, role }] = await idm.getIdentity(employee.domain)

      return { ...employee, name, role }
    })
    .toPromise()
}

async function getAllEmployees () {
  const employee = []

  const lastEmployeeId = await app.call('nextEmployee')
    .first()
    .map(value => parseInt(value, 10))
    .toPromise()

  for (let id = 1; id < lastEmployeeId; id++) {
    employee.push(
      getEmployeeById(id)
    )
  }

  return Promise.all(employee)
}

function marshallCurrency (value) {
  return parseInt(value || 0, 10)
}

function marshallDate (epoch) {
  if (!epoch || BigInt(epoch) > Number.MAX_SAFE_INTEGER) {
    return null
  }

  return parseInt(epoch, 10) * 1000
}

function marshallEmployeeData (data) {
  const result = {
    id: data.id,
    accountAddress: data.accountAddress,
    domain: data.name,
    salary: marshallCurrency(data.denominationSalary),
    accruedValue: marshallCurrency(data.accruedValue),
    startDate: marshallDate(data.startDate),
    endDate: marshallDate(data.endDate),
    terminated: data.terminated
  }

  if (result.accruedValue < 1) {
    result.startDate = marshallDate(data.lastPayroll)
  } else {
    result.lastPayroll = marshallDate(data.lastPayroll)
  }

  return result
}