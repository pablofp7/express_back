class DatabaseConnection {
  async query({ query, queryParams }) {
    console.log(`Executing query: ${query} with params: ${queryParams}`)
    return { affectedRows: Math.floor(Math.random() * 5) }
  }

  async beginTransaction() {
    console.log('Transaction started')
  }

  async commitTransaction() {
    console.log('Transaction committed')
  }

  async rollbackTransaction() {
    console.log('Transaction rolled back')
  }

  async executeTransaction(functionsToExecute = []) {
    if (!Array.isArray(functionsToExecute)) {
      throw new TypeError('functionsToExecute must be an array of functions.')
    }

    await this.beginTransaction()

    try {
      for (const fn of functionsToExecute) {
        if (typeof fn !== 'function') {
          throw new TypeError('Each item in functionsToExecute must be a function.')
        }
        await fn()
      }

      await this.commitTransaction()
    }
    catch (error) {
      await this.rollbackTransaction()
      console.error('Error during transaction:', error.message)
    }
  }
}

async function deleteUserExample({ userId }) {
  const db = new DatabaseConnection()
  let result

  const deleteRoles = async () => {
    await db.query({
      query: 'DELETE FROM user_roles WHERE user_id = ?',
      queryParams: [userId],
    })
  }

  const deleteUser = async () => {
    result = await db.query({
      query: 'DELETE FROM user WHERE id = ?',
      queryParams: [userId],
    })
  }

  await db.executeTransaction([deleteRoles, deleteUser])

  return result
}

const result = await deleteUserExample({ userId: 123 })
console.log('Final result:', result)
