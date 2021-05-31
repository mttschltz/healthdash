import { PageProps } from 'gatsby'
import NoSleep from 'nosleep.js'
import {
  addReminder,
  completeChildTodo,
  completeTodo,
  Reminder,
  Session,
  startSession,
  stopSession,
  uncompleteChildTodo,
  uncompleteTodo,
  updateReminderConfig,
} from '@/models/models'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Stack,
  ChakraProvider,
} from '@chakra-ui/react'

import {
  ReminderConfig,
  ReminderConfigValues,
} from '@/components/ReminderConfig'
import { ActiveReminderManager } from '@/components/ActiveReminder'

const haveValuesChanged = (v: ReminderConfigValues, r: Reminder) =>
  v.name !== r.name ||
  v.interval !== r.interval ||
  v.todos.length !== r.todos.length ||
  v.todos.some((t, j) => t !== r.todos[j].name) ||
  (v.child && !r.child) ||
  (!v.child && r.child) ||
  (v.child && r.child && haveValuesChanged(v.child, r.child), r.child)

const Home: React.FC<PageProps> = () => {
  const [session, setSession] = useState<Session>(() => ({
    reminders: [],
    started: null,
    stopped: null,
  }))
  const [isSessionStarted, setIsSessionStarted] = useState(false)
  const [reminderValidities, setReminderValidities] = useState<boolean[]>([])
  const [noSleep, setNoSleep] = useState<NoSleep>()

  useEffect(() => {
    setNoSleep(new NoSleep())
  }, [])

  const startSessionCallback = useCallback(() => {
    setSession(startSession(session))
    setIsSessionStarted(true)
    // Enable wake lock.
    // (must be wrapped in a user input event handler e.g. a mouse or touch handler)
    if (noSleep && !noSleep.isEnabled) {
      noSleep?.enable()
    }
  }, [noSleep, session])

  const stopSessionCallback = useCallback(() => {
    setSession(stopSession(session))
    setIsSessionStarted(false)
    if (noSleep?.isEnabled) {
      noSleep.disable()
    }
  }, [noSleep, session])

  const addReminderCallback = useCallback(
    (r: Reminder) => {
      setSession(addReminder(session, r))
      setReminderValidities([...reminderValidities, true])
    },
    [session, reminderValidities],
  )

  const updateReminderValidityCallback = useCallback(
    (i: number, valid: boolean) => {
      const newReminderValidities = [...reminderValidities]
      newReminderValidities[i] = valid
      setReminderValidities(newReminderValidities)
    },
    [reminderValidities],
  )

  const updateReminderCallback = useCallback(
    (newValues: ReminderConfigValues, i: number) => {
      const r = session.reminders[i]
      if (haveValuesChanged(newValues, r)) {
        setSession(
          updateReminderConfig(
            session,
            i,
            newValues.name,
            newValues.interval,
            newValues.todos,
            newValues.child,
          ),
        )
      }
      const newReminderValidities = [...reminderValidities]
      newReminderValidities[i] = true
      setReminderValidities(newReminderValidities)
    },
    [session, reminderValidities],
  )

  const completeTodoCallback = useCallback(
    (tn: string, ri: number) => {
      setSession(completeTodo(session, ri, tn))
    },
    [session],
  )

  const uncompleteTodoCallback = useCallback(
    (tn: string, ri: number) => {
      setSession(uncompleteTodo(session, ri, tn))
    },
    [session],
  )

  const completeChildTodoCallback = useCallback(
    (ctn: string, ri: number) => {
      setSession(completeChildTodo(session, ri, ctn))
    },
    [session],
  )

  const uncompleteChildTodoCallback = useCallback(
    (ctn: string, ri: number) => {
      setSession(uncompleteChildTodo(session, ri, ctn))
    },
    [session],
  )

  return (
    <ChakraProvider>
      <Center>
        <Flex
          direction="column"
          spacing={4}
          width="100%"
          padding={2}
          maxW="lg"
          minW="md"
          minH="100vh"
          justifyContent="space-between"
        >
          <Box width="100%">
            {!isSessionStarted && (
              <>
                <Heading size="md">Reminder Configs</Heading>
                <Stack spacing={2}>
                  {session?.reminders.map((r, i) => (
                    <ReminderConfig
                      // disable this rule as there's nothing inherently unique about reminders
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      initialValues={{
                        interval: r.interval,
                        name: r.name,
                        todos: r.todos?.map((t) => t.name),
                        child: !r.child
                          ? undefined
                          : {
                              interval: r.child.interval,
                              name: r.child.name,
                              todos: r.child.todos?.map((t) => t.name),
                            },
                      }}
                      onUpdate={(newValues, valid) => {
                        if (!valid) {
                          updateReminderValidityCallback(i, false)
                        } else {
                          updateReminderCallback(newValues, i)
                        }
                      }}
                    />
                  ))}
                </Stack>
              </>
            )}
            {isSessionStarted && (
              <>
                <Stack spacing={4}>
                  {session?.reminders.map((r, i) => (
                    <ActiveReminderManager
                      reminder={r}
                      // disable this rule as there's nothing inherently unique about reminders
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      completeTodo={(tn: string) => {
                        completeTodoCallback(tn, i)
                      }}
                      uncompleteTodo={(tn: string) => {
                        uncompleteTodoCallback(tn, i)
                      }}
                      completeChildTodo={(ctn: string) => {
                        completeChildTodoCallback(ctn, i)
                      }}
                      uncompleteChildTodo={(ctn: string) => {
                        uncompleteChildTodoCallback(ctn, i)
                      }}
                    />
                  ))}
                </Stack>
              </>
            )}
          </Box>
          {!isSessionStarted && (
            <Box>
              <Button
                width="100%"
                onClick={() => {
                  addReminderCallback({
                    name: `New reminder`,
                    interval: 30,
                    child: null,
                    todos: [
                      {
                        name: `Look away from screen`,
                        complete: false,
                      },
                      {
                        name: `Drink water`,
                        complete: false,
                      },
                      {
                        name: `Desk yoga`,
                        complete: false,
                      },
                    ],
                    nextDue: null,
                    completed: 0,
                  })
                }}
              >
                Add Reminder
              </Button>
            </Box>
          )}
          {session.stopped || !session.started ? (
            <Button
              width="100%"
              onClick={() => {
                startSessionCallback()
              }}
              disabled={
                session.reminders.length === 0 ||
                reminderValidities.some((v) => !v)
              }
            >
              Start
            </Button>
          ) : (
            <Button
              width="100%"
              borderRadius={0}
              onClick={() => {
                stopSessionCallback()
              }}
            >
              Stop
            </Button>
          )}
        </Flex>
      </Center>
    </ChakraProvider>
  )
}

export default Home
