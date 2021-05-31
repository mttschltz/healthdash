import {
  Box,
  Checkbox,
  Flex,
  Heading,
  Spacer,
  Stack,
  Text,
} from '@chakra-ui/react'
import { Reminder, Todo } from '@/models/models'
import React, {
  FunctionComponent,
  useState,
  useEffect,
  useCallback,
} from 'react'

type ReminderStatus = 'pending' | 'overdue'

const calcMinutesRemaining = (d1: Date, d2: Date | null) =>
  d2 === null ? -1 : Math.ceil((d2.getTime() - d1.getTime()) / 60000)

export interface ActiveReminderManagerProps {
  reminder: Reminder
  completeTodo: (tn: string) => void
  uncompleteTodo: (tn: string) => void
  completeChildTodo: (ctn: string) => void
  uncompleteChildTodo: (ctn: string) => void
}

interface ActiveReminderProps {
  name: string
  interval: number
  todos: Todo[]

  completed: number
  nextDue: Date | null

  minRemaining: number | null
  status: ReminderStatus
  parentMinRemaining?: number | null
  parentName?: string
  updateTodoCallback: (tn: string, checked: boolean) => void
}

const ActiveReminder: FunctionComponent<ActiveReminderProps> = ({
  name,
  todos,
  status,
  minRemaining,
  parentName,
  parentMinRemaining,
  updateTodoCallback,
}) => (
  <Box
    spacing={2}
    p={4}
    bgColor={status === `pending` ? `lightgreen` : `lightpink`}
  >
    <Stack>
      {parentName && (
        <Flex>
          <Heading size="sm">{parentName}</Heading>
          <Spacer />
          <Heading size="sm">{parentMinRemaining}m left</Heading>
        </Flex>
      )}
      <Flex>
        <Heading size="lg">{name}</Heading>
        <Spacer />
        {minRemaining && (
          <Heading size="lg">
            {status === `overdue` ? `Due` : `${minRemaining}m left`}
          </Heading>
        )}
      </Flex>
      <Spacer />
      {todos.map((t, i) =>
        status === `overdue` ? (
          <Checkbox
            // disable this rule as there's nothing inherently unique about todos
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            size="lg"
            onChange={(e) => {
              updateTodoCallback(t.name, e.target.checked)
            }}
            colorScheme="red"
          >
            {t.name}
          </Checkbox>
        ) : (
          // disable this rule as there's nothing inherently unique about todos
          // eslint-disable-next-line react/no-array-index-key
          <Text fontSize="lg" key={i}>
            {t.name}
          </Text>
        ),
      )}
    </Stack>
  </Box>
)

const shouldParentOverrideChild = (
  parentReminder: Reminder,
  childReminder: Reminder | null,
) =>
  childReminder === null || // no child
  // parent has less remaining, with 1 min buffer
  // use times not minRemaining as rounding causes problems
  (parentReminder.nextDue !== null &&
    childReminder.nextDue !== null &&
    parentReminder.nextDue <=
      new Date(childReminder.nextDue.getTime() + 60000)) ||
  // parent is overdue
  (parentReminder.nextDue !== null && parentReminder.nextDue <= new Date())

export const ActiveReminderManager: FunctionComponent<ActiveReminderManagerProps> =
  ({
    completeTodo,
    uncompleteTodo,
    completeChildTodo,
    uncompleteChildTodo,
    reminder: parentReminder,
  }) => {
    const childReminder = parentReminder.child
    const [minRemainingChild, setMinRemainingChild] =
      useState<number | null>(null)
    const [minRemainingParent, setMinRemainingParent] =
      useState<number | null>(null)
    const [childIsActive, setChildIsActive] = useState(false)
    const [status, setStatus] = useState<ReminderStatus>(`pending`)

    const updateTodoCallback = useCallback(
      (tn: string, checked: boolean) => {
        if (checked) {
          completeTodo(tn)
        } else {
          uncompleteTodo(tn)
        }
      },
      [completeTodo, uncompleteTodo],
    )

    const updateChildTodoCallback = useCallback(
      (tn: string, checked: boolean) => {
        if (checked) {
          completeChildTodo(tn)
        } else {
          uncompleteChildTodo(tn)
        }
      },
      [completeChildTodo, uncompleteChildTodo],
    )

    useEffect(() => {
      const update = () => {
        if (
          shouldParentOverrideChild(parentReminder, childReminder) ||
          childReminder === null
        ) {
          const newMinRemainingParent = calcMinutesRemaining(
            new Date(),
            parentReminder.nextDue,
          )
          setChildIsActive(false)
          setStatus(newMinRemainingParent <= 0 ? `overdue` : `pending`)
          setMinRemainingParent(newMinRemainingParent)
          const newMinRemainingChild = calcMinutesRemaining(
            new Date(),
            childReminder?.nextDue || null,
          )
          setMinRemainingChild(newMinRemainingChild)
        } else {
          const newMinRemainingChild = calcMinutesRemaining(
            new Date(),
            childReminder.nextDue,
          )
          setChildIsActive(true)
          setStatus(newMinRemainingChild <= 0 ? `overdue` : `pending`)
          setMinRemainingChild(newMinRemainingChild)
          const newMinRemainingParent = calcMinutesRemaining(
            new Date(),
            parentReminder.nextDue,
          )
          setMinRemainingParent(newMinRemainingParent)
        }
      }
      update()

      const interval = setInterval(update, 2000)

      return () => clearInterval(interval)
    }, [childReminder, parentReminder])

    return childIsActive && childReminder ? (
      <ActiveReminder
        completed={childReminder.completed}
        interval={childReminder.interval}
        minRemaining={minRemainingChild}
        name={childReminder.name}
        nextDue={childReminder.nextDue}
        status={status}
        todos={childReminder.todos}
        updateTodoCallback={updateChildTodoCallback}
        parentMinRemaining={minRemainingParent}
        parentName={parentReminder.name}
      />
    ) : (
      <ActiveReminder
        completed={parentReminder.completed}
        interval={parentReminder.interval}
        minRemaining={minRemainingParent}
        name={parentReminder.name}
        nextDue={parentReminder.nextDue}
        status={status}
        todos={parentReminder.todos}
        updateTodoCallback={updateTodoCallback}
      />
    )
  }
